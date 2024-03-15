type EvaluationBase<T> = {
  id_type: string;
  name: string;
  rule_id: string;
  secondary_exposures: SecondaryExposure[];
  value: T;
};

export type SecondaryExposure = {
  gate: string;
  gateValue: string;
  ruleID: string;
};

export type GateEvaluation = EvaluationBase<boolean>;

export type ExperimentEvaluation = EvaluationBase<Record<string, unknown>> & {
  group_name?: string;
  group: string;
  id_type: string;
  is_device_based: boolean;
  is_experiment_active?: boolean;
  is_user_in_experiment?: boolean;
};

export type DynamicConfigEvaluation = ExperimentEvaluation;

export type LayerEvaluation = Omit<ExperimentEvaluation, 'id_type'> & {
  allocated_experiment_name: string;
  explicit_parameters: string[];
  undelegated_secondary_exposures?: SecondaryExposure[];
};

export type AnyEvaluation =
  | GateEvaluation
  | ExperimentEvaluation
  | DynamicConfigEvaluation
  | LayerEvaluation;

export type EvaluationDetails = {
  reason: string;
  lcut?: number;
  receivedAt?: number;
};

export type DetailedEvaluation<T extends AnyEvaluation> = {
  evaluation: T | null;
  details: EvaluationDetails;
};
