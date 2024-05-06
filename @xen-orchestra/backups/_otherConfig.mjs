// in `other_config` of an incrementally replicated VM or VDI
// contains the UUID of the object used as a base for an incremental export
// used to search for the replica of the base before applying a incremental replication
export const BASE_DELTA = 'xo:base_delta'

// in `other_config` of an incrementally replicated VM, contains the UUID of the target SR used for replication
//
// added after the complete replication
export const REPLICATED_TO_SR_UUID = 'xo:backup:sr'

// in other_config of VMs and VDIs of an incrementally replicated VM
// contains the UUID of the source  exported objevt (snapshot or VM)

export const COPY_OF = 'xo:copy_of'

export const DATETIME = 'xo:backup:datetime'

export const JOB_ID = 'xo:backup:job'
export const SCHEDULE_ID = 'xo:backup:job'

export const DELTA_CHAIN_LENGTH = 'xo:backup:deltaChainLength'
export const EXPORTED_SUCCESSFULLY = 'xo:backup:exported'

// the VM ( not the snapshot) uuid
export const VM_UUID = 'xo:backup:vm'
