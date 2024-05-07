import { formatDateTime } from '@xen-orchestra/xapi'
import assert from 'node:assert/strict'
// in `other_config` of an incrementally replicated VM or VDI
// contains the UUID of the object used as a base for an incremental export
// used to search for the replica of the base before applying a incremental replication
export const BASE_DELTA_VM = 'xo:base_delta'
export const BASE_DELTA_VDI = 'xo:base_delta_vdi'

// in `other_config` of an incrementally replicated VM, contains the UUID of the target SR used for replication
//
// added after the complete replication
export const REPLICATED_TO_SR_UUID = 'xo:backup:sr'

// in other_config of VMs and VDIs of an incrementally replicated VM
// contains the UUID of the source  exported objevt (snapshot or VM)

export const COPY_OF = 'xo:copy_of'

export const DATETIME = 'xo:backup:datetime'

export const JOB_ID = 'xo:backup:job'
export const SCHEDULE_ID = 'xo:backup:schedule'

export const DELTA_CHAIN_LENGTH = 'xo:backup:deltaChainLength'
export const EXPORTED_SUCCESSFULLY = 'xo:backup:exported'

// the VM ( not the snapshot) uuid
export const VM_UUID = 'xo:backup:vm'

async function listVdiRefs(xapi, vmRef) {
  return xapi.VM_getDisks(vmRef)
}

export async function incrementVmDeltaChainLength(xapi, ref) {
  // @todo : apply this to the VDI
  const length = await getDeltaVmChainLength(xapi, ref)
  await xapi.setFieldEntry('VM', ref, 'other_config', DELTA_CHAIN_LENGTH, String(length + 1))
}

export async function getDeltaVmChainLength(xapi, ref) {
  // @todo get the longest chain of a VDI
  const otherConfig = await xapi.getField('VM', ref, 'other_config')
  return otherConfig[DELTA_CHAIN_LENGTH] ?? '0'
}

export async function resetVmOtherConfig(xapi, vmRef) {
  // @todo apply this to all vdis
  await xapi.setFieldEntries('VM', vmRef, {
    [DATETIME]: null,
    [DELTA_CHAIN_LENGTH]: null,
    [EXPORTED_SUCCESSFULLY]: null,
    [JOB_ID]: null,
    [SCHEDULE_ID]: null,
    [VM_UUID]: null,
    // REPLICATED_TO_SR_UUID is not reste since we can replicate a replication
  })
}

export async function setVmOtherConfig(xapi, vmRef, { timestamp, jobId, scheduleId, vmUuid, srUuid = null, ...other }) {
  assert.notEqual(timestamp, undefined)
  assert.notEqual(jobId, undefined)
  assert.notEqual(scheduleId, undefined)
  assert.notEqual(vmUuid, undefined)
  // srUuid is nullish for backup
  assert.equal(Object.keys(other).length, 0)
  const vdiRefs = await listVdiRefs(xapi, vmRef)
  await Promise.all([
    xapi.setFieldEntries('VM', vmRef, 'other_config', {
      [REPLICATED_TO_SR_UUID]: srUuid,
      [DATETIME]: formatDateTime(timestamp),
      [JOB_ID]: jobId,
      [SCHEDULE_ID]: scheduleId,
      [VM_UUID]: vmUuid,
    }),
    ...vdiRefs.map(vdiRef =>
      xapi.setFieldEntries('VDI', vdiRef, 'other_config', {
        [REPLICATED_TO_SR_UUID]: srUuid,
        [DATETIME]: formatDateTime(timestamp),
        [JOB_ID]: jobId,
        [SCHEDULE_ID]: scheduleId,
        [VM_UUID]: vmUuid,
      })
    ),
  ])
}
export async function markExportSuccessfull(xapi, vmRef) {
  // @todo apply this to all vdis
  const vdiRefs = await listVdiRefs(xapi, vmRef)
  await Promise.all([
    xapi.setFieldEntry('VM', vmRef, 'other_config', EXPORTED_SUCCESSFULLY, 'true'),
    ...vdiRefs.map(vdiRef => xapi.setFieldEntry('VDI', vdiRef, 'other_config', EXPORTED_SUCCESSFULLY, 'true')),
  ])
}
