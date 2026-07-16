import "server-only";

import { cookies } from "next/headers";
import { ACCOUNT_COOKIE, ALL_ACCOUNTS } from "./accounts";

/**
 * Read the current account id from the cookie (server component only).
 * Returns "all" if the user is browsing every account.
 */
export async function readCurrentAccountId(): Promise<string> {
  const jar = await cookies();
  return jar.get(ACCOUNT_COOKIE)?.value ?? ALL_ACCOUNTS;
}
