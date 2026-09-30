import { dispatchNeuronTask, NeuronTask, validateNeuronTask, validateOrchestratorExecutionResult, OrchestrationStatusEnum } from '../../src/runtime/cognitive-orchestrator';

describe('Cognitive Orchestrator', () => {
  const orchestratorId = 'orchestrator-core';
  const validTimestamp = '2026-09-30T15:00:00.000Z';
  const mockNeuron = jest.fn();

  beforeEach(() => {
    mockNeuron.mockClear();
    mockNeuron.mockReturnValue({ success: true, processedData: 'abc' });
  });

  it('should halt execution securely (HALTED_BY_SECURITY) without calling neuron on explicit conflict', () => {
    const invalidTask: NeuronTask = {
      taskId: 'task-1',
      targetNeuron: 'LogicNeuron',
      requestedAt: validTimestamp,
      problemContext: {
        provenanceRefs: ['prov-1'],
        variables: [],
        evidenceRefs: ['ev-1'],
        uncertainties: [{ impact: 'LOW' } as any],
        constraints: ['Explicit CONFLICT declared']
      } as any
    };

    const result = dispatchNeuronTask(invalidTask, validTimestamp, orchestratorId, mockNeuron);

    expect(result.status).toBe(OrchestrationStatusEnum.HALTED_BY_SECURITY);
    expect(result.verificationReport.isPermitted).toBe(false);
    expect(result.neuronOutput).toBeUndefined();
    expect(mockNeuron).not.toHaveBeenCalled();
    expect(validateOrchestratorExecutionResult(result).success).toBe(true);
  });

  it('should halt execution securely (HALTED_BY_SECURITY) for missing provenance', () => {
    const invalidTask: NeuronTask = {
      taskId: 'task-2',
      targetNeuron: 'LogicNeuron',
      requestedAt: validTimestamp,
      problemContext: {
        provenanceRefs: [],
        variables: [],
        evidenceRefs: ['ev-1']
      } as any
    };

    const result = dispatchNeuronTask(invalidTask, validTimestamp, orchestratorId, mockNeuron);

    expect(result.status).toBe(OrchestrationStatusEnum.HALTED_BY_SECURITY);
    expect(result.verificationReport.isPermitted).toBe(false);
    expect(mockNeuron).not.toHaveBeenCalled();
    expect(validateOrchestratorExecutionResult(result).success).toBe(true);
  });

  it('should permit execution conditionally and return neuron output', () => {
    const validTask: NeuronTask = {
      taskId: 'task-3',
      targetNeuron: 'LogicNeuron',
      requestedAt: validTimestamp,
      problemContext: {
        provenanceRefs: ['prov-1'],
        variables: [{ id: 'var-1', provenanceRefs: ['prov-2'], evidenceRefs: ['ev-2'] }],
        evidenceRefs: ['ev-1'],
        uncertainties: [{ impact: 'HIGH', mitigation: 'Added buffer' } as any],
        constraints: ['Strict bound']
      } as any
    };

    const result = dispatchNeuronTask(validTask, validTimestamp, orchestratorId, mockNeuron);

    expect(result.status).toBe(OrchestrationStatusEnum.EXECUTED_CONDITIONALLY);
    expect(result.verificationReport.isPermitted).toBe(true);
    expect(result.neuronOutput).toEqual({ success: true, processedData: 'abc' });
    expect(mockNeuron).toHaveBeenCalledTimes(1);
    expect(mockNeuron).toHaveBeenCalledWith(validTask);
    expect(validateOrchestratorExecutionResult(result).success).toBe(true);
  });

  it('should validate neuron task input successfully', () => {
    const taskInput = {
      taskId: 'task-4',
      targetNeuron: 'MathNeuron',
      requestedAt: validTimestamp,
      problemContext: {
        id: 'problem-1',
        variables: [{
          id: 'v1', value: '1', epistemicStatus: 'OBSERVED', provenanceRefs: [], evidenceRefs: []
        }],
        units: {},
        domains: {},
        assumptions: [],
        constraints: [],
        evidenceRefs: ['ev-1'],
        objective: 'Test',
        temporalScope: 'Current',
        provenanceRefs: ['prov-1'],
        uncertainties: []
      }
    };
    expect(validateNeuronTask(taskInput).success).toBe(true);
  });
});
