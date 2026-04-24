/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dailyBriefs from "../dailyBriefs.js";
import type * as dashboard from "../dashboard.js";
import type * as events from "../events.js";
import type * as goalProjects from "../goalProjects.js";
import type * as goals from "../goals.js";
import type * as goalsHelpers from "../goalsHelpers.js";
import type * as projectNextActions from "../projectNextActions.js";
import type * as projects from "../projects.js";
import type * as taskGroups from "../taskGroups.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  dailyBriefs: typeof dailyBriefs;
  dashboard: typeof dashboard;
  events: typeof events;
  goalProjects: typeof goalProjects;
  goals: typeof goals;
  goalsHelpers: typeof goalsHelpers;
  projectNextActions: typeof projectNextActions;
  projects: typeof projects;
  taskGroups: typeof taskGroups;
  tasks: typeof tasks;
  users: typeof users;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
