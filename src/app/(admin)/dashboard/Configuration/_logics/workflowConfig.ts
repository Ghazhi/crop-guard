// ─── Workflow Stages: admin-editable enrollment workflow stage names ─────────
// A tenant admin can rename stages and choose which stage qualifies a farmer
// as a "Beneficiary" (Programs & Cohorts > Beneficiary tab). All consumers
// (FarmersRegistry's FarmerSheet, EnrollmentWorkflow, ProgramsSetup) read
// stage names from this same persisted source so a rename propagates everywhere.

export interface WorkflowStageDef {
  id:    string
  stage: number
  name:  string
}

export const DEFAULT_WORKFLOW_STAGES: WorkflowStageDef[] = [
  { id: 'wf-1', stage: 1, name: 'Submitted'      },
  { id: 'wf-2', stage: 2, name: 'Consent'        },
  { id: 'wf-3', stage: 3, name: 'Under Review'   },
  { id: 'wf-4', stage: 4, name: 'Credit Review'  },
  { id: 'wf-5', stage: 5, name: 'Final Approval' },
  { id: 'wf-6', stage: 6, name: 'Active'         },
  { id: 'wf-7', stage: 7, name: 'Delivered'      },
  { id: 'wf-8', stage: 8, name: 'Repayment'      },
]

export const DEFAULT_QUALIFYING_STAGE_ID = 'wf-6'

export const WORKFLOW_STAGES_KEY = 'workflowConfig.stages'
export const WORKFLOW_QUALIFYING_STAGE_ID_KEY = 'workflowConfig.qualifyingStageId'
