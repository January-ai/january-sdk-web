import type {
  CreateFoodLogRequest,
  DeleteFoodLogRequest,
  ListFoodLogsRequest,
  PartnerUserContext,
  PredictGlucoseRequest,
  UpdateFoodLogRequest,
} from './models.js';
import type { FoodLogsResource } from './resources/food-logs.js';
import type { GlucoseResource } from './resources/glucose.js';

type WithoutUserContext<T> = Omit<T, keyof PartnerUserContext>;

export type UserCreateFoodLogRequest = WithoutUserContext<CreateFoodLogRequest>;
export type UserListFoodLogsRequest = WithoutUserContext<ListFoodLogsRequest>;
export type UserUpdateFoodLogRequest = WithoutUserContext<UpdateFoodLogRequest>;
export type UserDeleteFoodLogRequest = WithoutUserContext<DeleteFoodLogRequest>;
export type UserPredictGlucoseRequest = WithoutUserContext<PredictGlucoseRequest>;

export class UserFoodLogsResource {
  constructor(
    private readonly resource: FoodLogsResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  create(request: UserCreateFoodLogRequest) {
    return this.resource.create({ ...request, ...this.context });
  }

  list(request: UserListFoodLogsRequest) {
    return this.resource.list({ ...request, ...this.context });
  }

  update(request: UserUpdateFoodLogRequest) {
    return this.resource.update({ ...request, ...this.context });
  }

  delete(request: UserDeleteFoodLogRequest) {
    return this.resource.delete({ ...request, ...this.context });
  }
}

export class UserGlucoseResource {
  constructor(
    private readonly resource: GlucoseResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  predict(request: UserPredictGlucoseRequest) {
    return this.resource.predict({ ...request, ...this.context });
  }
}

/** A lightweight view over one client. The host app remains responsible for identity persistence. */
export class JanuaryPartnerUserClient {
  readonly context: Readonly<PartnerUserContext>;
  readonly foodLogs: UserFoodLogsResource;
  readonly glucose: UserGlucoseResource;

  constructor(resources: { foodLogs: FoodLogsResource; glucose: GlucoseResource }, context: PartnerUserContext) {
    const endUserId = context.endUserId.trim();
    if (!endUserId) throw new TypeError('A partner end-user ID is required.');
    const endUserTimezone = context.endUserTimezone?.trim();
    this.context = Object.freeze({
      endUserId,
      ...(endUserTimezone ? { endUserTimezone } : {}),
    });
    this.foodLogs = new UserFoodLogsResource(resources.foodLogs, this.context);
    this.glucose = new UserGlucoseResource(resources.glucose, this.context);
  }
}
