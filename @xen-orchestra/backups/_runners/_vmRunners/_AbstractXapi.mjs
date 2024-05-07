import assert from 'node:assert'
import groupBy from 'lodash/groupBy.js'
import ignoreErrors from 'promise-toolbox/ignoreErrors'
import { asyncMap } from '@xen-orchestra/async-map'
import { decorateMethodsWith } from '@vates/decorate-with'
import { defer } from 'golike-defer'

import { getOldEntries } from '../../_getOldEntries.mjs'
import { Task } from '../../Task.mjs'
import { Abstract } from './_Abstract.mjs'
import { DATETIME, JOB_ID, SCHEDULE_ID, resetVmOtherConfig, setVmOtherConfig } from '../../_otherConfig.mjs'

export const AbstractXapi = class AbstractXapiVmBackupRunner extends Abstract {
  constructor({
    config,
    getSnapshotNameLabel,
    healthCheckSr,
    job,
    remoteAdapters,
    remotes,
    schedule,
    settings,
    srs,
    throttleStream,
    vm,
  }) {
    super()
    if (vm.other_config[JOB_ID] === job.id && 'start' in vm.blocked_operations) {
      // don't match replicated VMs created by this very job otherwise they
      // will be replicated again and again
      throw new Error('cannot backup a VM created by this very job')
    }

    const currentOperations = Object.values(vm.current_operations)
    if (currentOperations.some(_ => _ === 'migrate_send' || _ === 'pool_migrate')) {
      throw new Error('cannot backup a VM currently being migrated')
    }

    this.config = config
    this.job = job
    this.remoteAdapters = remoteAdapters
    this.scheduleId = schedule.id
    this.timestamp = undefined

    // VM currently backed up
    const tags = (this._tags = vm.tags)

    // VM (snapshot) that is really exported
    this._exportedVm = undefined
    this._vm = vm

    this._baseVdis = undefined
    this._getSnapshotNameLabel = getSnapshotNameLabel
    this._isIncremental = job.mode === 'delta'
    this._healthCheckSr = healthCheckSr
    this._jobId = job.id
    this._jobSnapshotVms = undefined
    this._jobSnapshotVdis = undefined
    this._throttleStream = throttleStream
    this._xapi = vm.$xapi

    // Base VM for the export
    this._baseVdis = undefined

    // Settings for this specific run (job, schedule, VM)
    if (tags.includes('xo-memory-backup')) {
      settings.checkpointSnapshot = true
    }
    if (tags.includes('xo-offline-backup')) {
      settings.offlineSnapshot = true
    }
    this._settings = settings
    // Create writers
    {
      const writers = new Set()
      this._writers = writers

      const [BackupWriter, ReplicationWriter] = this._getWriters()

      const allSettings = job.settings
      Object.entries(remoteAdapters).forEach(([remoteId, adapter]) => {
        const targetSettings = {
          ...settings,
          ...allSettings[remoteId],
        }
        if (targetSettings.exportRetention !== 0) {
          writers.add(
            new BackupWriter({
              adapter,
              config,
              healthCheckSr,
              job,
              scheduleId: schedule.id,
              vmUuid: vm.uuid,
              remoteId,
              settings: targetSettings,
            })
          )
        }
      })
      srs.forEach(sr => {
        const targetSettings = {
          ...settings,
          ...allSettings[sr.uuid],
        }
        if (targetSettings.copyRetention !== 0) {
          writers.add(
            new ReplicationWriter({
              config,
              healthCheckSr,
              job,
              scheduleId: schedule.id,
              vmUuid: vm.uuid,
              sr,
              settings: targetSettings,
            })
          )
        }
      })
    }
  }

  // ensure the VM itself does not have any backup metadata which would be
  // copied on manual snapshots and interfere with the backup jobs
  async _cleanMetadata() {
    const vm = this._vm
    if (JOB_ID in vm.other_config) {
      await resetVmOtherConfig(this._xapi, vm.$ref)
    }
  }

  async _snapshot() {
    const vm = this._vm
    const xapi = this._xapi

    const settings = this._settings

    if (this._mustDoSnapshot()) {
      await Task.run({ name: 'snapshot' }, async () => {
        if (!settings.bypassVdiChainsCheck) {
          await vm.$assertHealthyVdiChains()
        }

        const snapshotRef = await vm[settings.checkpointSnapshot ? '$checkpoint' : '$snapshot']({
          ignoreNobakVdis: true,
          name_label: this._getSnapshotNameLabel(vm),
          unplugVusbs: true,
        })
        this.timestamp = Date.now()
        await setVmOtherConfig(xapi, snapshotRef, {
          timestamp: this.timestamp,
          jobId: this._jobId,
          scheduleId: this.scheduleId,
          vmUuid: vm.uuid,
        })
        this._exportedVm = await xapi.getRecord('VM', snapshotRef)

        return this._exportedVm.uuid
      })
    } else {
      this._exportedVm = vm
      this.timestamp = Date.now()
    }
  }

  async _fetchJobSnapshots() {
    const jobId = this._jobId
    const vmRef = this._vm.$ref
    const xapi = this._xapi

    const snapshotsRef = await xapi.getField('VM', vmRef, 'snapshots')
    const snapshotsOtherConfig = await asyncMap(snapshotsRef, ref => xapi.getField('VM', ref, 'other_config'))

    const snapshots = []
    snapshotsOtherConfig.forEach((other_config, i) => {
      if (other_config[JOB_ID] === jobId) {
        snapshots.push({ other_config, $ref: snapshotsRef[i] })
      }
    })
    snapshots.sort((a, b) => (a.other_config[DATETIME] < b.other_config[DATETIME] ? -1 : 1))
    this._jobSnapshotVms = snapshots

    // no base Vm with CBT

    this._jobSnapshotVdis = []
    const srcVdis = await xapi.getRecords('VDI', await this._vm.$getDisks())
    for (const srcVdi of srcVdis) {
      const snapshots = await xapi.getRecords('VDI', srcVdi.snapshots)
      for (const snapshot of snapshots) {
        if (snapshot.other_config[JOB_ID] === jobId) {
          this._jobSnapshotVdis.push(snapshot)
        }
      }
    }

    if (this._jobSnapshotVdis.length === 0) {
      // @todo fallback to previous method, by vm 20240501
      // to ensure compatilibity with existing snapshot
    }
  }

  async _removeUnusedSnapshots() {
    const allSettings = this.job.settings
    const baseSettings = this._baseSettings

    const snapshotsPerSchedule = groupBy(this._jobSnapshotVms, _ => _.other_config[SCHEDULE_ID])
    const xapi = this._xapi
    await asyncMap(Object.entries(snapshotsPerSchedule), ([scheduleId, snapshots]) => {
      const settings = {
        ...baseSettings,
        ...allSettings[scheduleId],
        ...allSettings[this._vm.uuid],
      }
      const retention = Math.max(settings.snapshotRetention, 1)
      // ensure we never delete the last one
      snapshots.sort((a, b) => (a.other_config[DATETIME] < b.other_config[DATETIME] ? -1 : 1))
      // @todo : filter exported=false snapshot
      return asyncMap(getOldEntries(retention, snapshots), ({ $ref }) => {
        return xapi.VM_destroy($ref)
      })
      // todo : delete the vdis snapshot
      // todo : delete the content of cbt enabdled VDI and the VM
    })
  }

  async copy() {
    throw new Error('Not implemented')
  }

  _getWriters() {
    throw new Error('Not implemented')
  }

  _mustDoSnapshot() {
    throw new Error('Not implemented')
  }

  async _selectBaseVm() {
    throw new Error('Not implemented')
  }

  async run($defer) {
    const settings = this._settings
    assert(
      !settings.offlineBackup || settings.snapshotRetention === 0,
      'offlineBackup is not compatible with snapshotRetention'
    )

    await this._callWriters(async writer => {
      await writer.beforeBackup()
      $defer(async () => {
        await writer.afterBackup()
      })
    }, 'writer.beforeBackup()')

    const vm = this._vm

    // block migration during the backup on the VM itself, not the latest snapshot
    {
      const { pool_migrate, migrate_send } = vm.blocked_operations

      const reason = 'VM migration is blocked during backup'
      await vm.update_blocked_operations({ pool_migrate: reason, migrate_send: reason })

      $defer(() =>
        // delete the entries if they did not exist previously or if they were
        // equal to reason (which happen if a previous backup was interrupted
        // before resetting them)
        vm.update_blocked_operations({
          migrate_send: migrate_send === undefined || migrate_send === reason ? null : migrate_send,
          pool_migrate: pool_migrate === undefined || pool_migrate === reason ? null : pool_migrate,
        })
      )
    }

    await this._fetchJobSnapshots()

    await this._selectBaseVm()

    await this._cleanMetadata()
    await this._removeUnusedSnapshots()

    const isRunning = vm.power_state === 'Running'
    const startAfter = isRunning && (settings.offlineBackup ? 'backup' : settings.offlineSnapshot && 'snapshot')
    if (startAfter) {
      await vm.$callAsync('clean_shutdown')
    }

    try {
      await this._snapshot()
      if (startAfter === 'snapshot') {
        ignoreErrors.call(vm.$callAsync('start', false, false))
      }

      if (this._writers.size !== 0) {
        await this._copy()
      }
    } finally {
      if (startAfter) {
        ignoreErrors.call(vm.$callAsync('start', false, false))
      }

      await this._fetchJobSnapshots()
      await this._removeUnusedSnapshots()
    }
    await this._healthCheck()
  }
}

decorateMethodsWith(AbstractXapi, {
  run: defer,
})
