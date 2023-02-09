import * as CM from 'complex-matcher'
import _ from 'intl'
import ActionButton from 'action-button'
import Button from 'button'
import decorate from 'apply-decorators'
import Dropzone from 'dropzone'
import React from 'react'
import { injectState, provideState } from 'reaclette'
import { InputCol, LabelCol, Row } from 'form-grid'
import { orderBy } from 'lodash'

import parseOvaFile from './ova'
import styles from './index.css'
import VmData from './vm-data'
import { formatSize, mapPlus, noop } from '../../common/utils'
import { importVms, isSrWritableOrIso } from '../../common/xo'
import { SelectPool, SelectSr } from '../../common/select-objects'

const FORMAT_TO_HANDLER = {
  ova: parseOvaFile,
  xva: noop,
}

const parseFile = async (file, type, func) => {
  try {
    return {
      data: await func(file),
      file,
      type,
    }
  } catch (error) {
    console.error(error)
    return { error, file, type }
  }
}

const getRedirectionUrl = vms =>
  vms.length === 0
    ? undefined // no redirect
    : vms.length === 1
    ? `/vms/${vms[0]}`
    : `/home?s=${encodeURIComponent(new CM.Property('id', new CM.Or(vms.map(_ => new CM.String(_)))).toString())}&t=VM`

const getInitialState = () => ({
  pool: undefined,
  sr: undefined,
  vms: [],
})

const XvaImport = decorate([
  provideState({
    initialState: getInitialState,
    effects: {
      handleImport: () => {
        const { sr, vms } = this.state
        return importVms(
          mapPlus(vms, (vm, push, vmIndex) => {
            if (!vm.error) {
              const ref = this.refs[`vm-data-${vmIndex}`]
              push({
                ...vm,
                data: ref && ref.value,
              })
            }
          }),
          sr
        )
      },
      onChangePool: (_, pool) => ({ pool, sr: pool.default_SR }),
      onChangeSr: (_, sr) => ({ sr }),
      onDrop: async files => {
        const vms = await Promise.all(
          mapPlus(files, (file, push) => {
            const { name } = file
            const extIndex = name.lastIndexOf('.')

            let func
            let type

            if (extIndex >= 0 && (type = name.slice(extIndex + 1).toLowerCase()) && (func = FORMAT_TO_HANDLER[type])) {
              push(parseFile(file, type, func))
            }
          })
        )

        return {
          vms: orderBy(vms, vm => [vm.error != null, vm.type, vm.file.name]),
        }
      },
      srPredicate: (_, sr) => isSrWritableOrIso(sr) && sr.$poolId === this.state.pool.uuid,
      reset: getInitialState,
    },
  }),
  injectState,
  ({ effects: { handleImport, onChangePool, onChangeSr, onDrop, reset, srPredicate }, state: { pool, sr, vms } }) => (
    <div>
      <Row>
        <LabelCol>{_('vmImportToPool')}</LabelCol>
        <InputCol>
          <SelectPool value={pool} onChange={onChangePool} required />
        </InputCol>
      </Row>
      <Row>
        <LabelCol>{_('vmImportToSr')}</LabelCol>
        <InputCol>
          <SelectSr disabled={pool === undefined} onChange={onChangeSr} predicate={srPredicate} required value={sr} />
        </InputCol>
      </Row>
      <div>
        <Dropzone onDrop={onDrop} message={_('importVmsList')} />
        <hr />
        <h5>{_('vmsToImport')}</h5>
        {vms.length > 0 ? (
          <div>
            {vms.map(({ data, error, file, type }, vmIndex) => (
              <div key={file.preview} className={styles.vmContainer}>
                <strong>{file.name}</strong>
                <span className='pull-right'>
                  <strong>{`(${formatSize(file.size)})`}</strong>
                </span>
                {!error ? (
                  data && (
                    <div>
                      <hr />
                      <div className='alert alert-info' role='alert'>
                        <strong>{_('vmImportFileType', { type })}</strong> {_('vmImportConfigAlert')}
                      </div>
                      <VmData {...data} ref={`vm-data-${vmIndex}`} pool={pool} />
                    </div>
                  )
                ) : (
                  <div>
                    <hr />
                    <div className='alert alert-danger' role='alert'>
                      <strong>{_('vmImportError')}</strong>{' '}
                      {(error && error.message) || _('noVmImportErrorDescription')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>{_('noSelectedVms')}</p>
        )}
        <hr />
        <div className='form-group pull-right'>
          <ActionButton
            btnStyle='primary'
            disabled={vms.length === 0}
            className='mr-1'
            form='import-form'
            handler={handleImport}
            icon='import'
            redirectOnSuccess={getRedirectionUrl}
            type='submit'
          >
            {_('newImport')}
          </ActionButton>
          <Button onClick={reset}>{_('importVmsCleanList')}</Button>
        </div>
      </div>
    </div>
  ),
])

export default XvaImport
