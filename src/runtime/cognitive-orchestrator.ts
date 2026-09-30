import { z } from 'zod';
import { FormalProblemSchema, FormalProblem } from '../verification/formal-problem';
import { RuntimeVerificationReportSchema, evaluateRuntimeIntent } from './verification-adapter';

export const NeuronTaskSchema = z.object({
  taskId: z.string().min(1),
  targetNeuron: z.string().min(1),
  problemContext: FormalProblemSchema,
  payload: z.record(z.unknown()).optional(),
  requestedAt: z.string().datetime()
});

export type NeuronTask = z.infer<typeof NeuronTaskSchema>;

export const validateNeuronTask = (input: unknown) => 
  NeuronTaskSchema.safeParse(input);

export enum OrchestrationStatusEnum {
  HALTED_BY_SECURITY = 'HALTED_BY_SECURITY',
  EXECUTED_CONDITIONALLY = 'EXECUTED_CONDITIONALLY'
}

export const OrchestratorExecutionResultSchema = z.object({
  taskId: z.string().min(1),
  targetNeuron: z.string().min(1),
  status: z.nativeEnum(OrchestrationStatusEnum),
  verificationReport: RuntimeVerificationReportSchema,
  neuronOutput: z.record(z.unknown()).optional(),
  orchestratedAt: z.string().datetime()
});

export type OrchestratorExecutionResult = z.infer<typeof OrchestratorExecutionResultSchema>;

export const validateOrchestratorExecutionResult = (input: unknown) => 
  OrchestratorExecutionResultSchema.safeParse(input);

export type PureNeuronFunction = (task: NeuronTask) => Record<string, unknown>;

export const dispatchNeuronTask = (
  task: NeuronTask,
  timestampISO: string,
  orchestratorComponentId: string,
  neuronImplementation: PureNeuronFunction
): OrchestratorExecutionResult => {
  const verificationReport = evaluateRuntimeIntent(
    task.problemContext, 
    timestampISO, 
    orchestratorComponentId
  );

  if (!verificationReport.isPermitted) {
    return {
      taskId: task.taskId,
      targetNeuron: task.targetNeuron,
      status: OrchestrationStatusEnum.HALTED_BY_SECURITY,
      verificationReport,
      orchestratedAt: timestampISO
    };
  }

  // Permitted -> execute neuron
  const neuronOutput = neuronImplementation(task);

  return {
    taskId: task.taskId,
    targetNeuron: task.targetNeuron,
    status: OrchestrationStatusEnum.EXECUTED_CONDITIONALLY,
    verificationReport,
    neuronOutput,
    orchestratedAt: timestampISO
  };
};
