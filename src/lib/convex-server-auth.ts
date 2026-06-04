import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

export async function fetchAuthedConvexMutation<
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
  args: FunctionArgs<Mutation>,
): Promise<FunctionReturnType<Mutation>> {
  const token = await getConvexServerToken();
  return await fetchMutation(mutation, args, { token });
}

export async function fetchAuthedConvexQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: FunctionArgs<Query>,
): Promise<FunctionReturnType<Query>> {
  const token = await getConvexServerToken();
  return await fetchQuery(query, args, { token });
}

export async function fetchAuthedConvexAction<
  Action extends FunctionReference<"action">,
>(
  action: Action,
  args: FunctionArgs<Action>,
): Promise<FunctionReturnType<Action>> {
  const token = await getConvexServerToken();
  return await fetchAction(action, args, { token });
}

async function getConvexServerToken() {
  const { getToken, sessionClaims } = await auth();
  const token =
    sessionClaims?.aud === "convex"
      ? await getToken()
      : await getToken({ template: "convex" });

  if (!token) {
    throw new Error("Could not get a Convex auth token for this request.");
  }

  return token;
}
