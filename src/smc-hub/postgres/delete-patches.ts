/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// This manages deleting patches. The underlying problem is that there could be a large number of patches, which stalls the DB.
// It's better to keep the number of row deletions small, to speed up the operation, only lock less rows for a shorter amount of time, etc.

import * as debug from "debug";
const L = debug("hub:db:delete-patches");
import { PostgreSQL } from "./types";
import { delay } from "awaiting";

// max number of patches to delete at once – 10000 should take a few seconds
const MAX_AT_ONCE = 10000;
// delay between deleting a chunk of patches
const DELAY_S = 1;

interface DeletePatchesOpts {
  db: PostgreSQL;
  string_id: string;
  cb?: Function;
}

async function patchset_limit(opts: {
  db: PostgreSQL;
  string_id: string;
}): Promise<string | undefined> {
  const { db, string_id } = opts;
  const q = await db.async_query({
    query: "SELECT time FROM patches",
    where: { "string_id = $::CHAR(40)": string_id },
    limit: 1,
    offset: MAX_AT_ONCE,
  });
  if (q.rows.length == 0) {
    return undefined;
  } else {
    return q.rows[0].time;
  }
}

export async function delete_patches(opts: DeletePatchesOpts): Promise<void> {
  const { db, string_id, cb } = opts;

  while (true) {
    const limit = await patchset_limit({ db, string_id });

    L(`deleting patches string_id='${string_id}' until limit='${limit}'`);
    const where = { "string_id = $::CHAR(40)": string_id };
    if (limit != null) {
      where["time <= $::TIMESTAMP"] = limit;
    }
    await db.async_query({
      query: "DELETE FROM patches",
      where,
    });
    if (limit != null) {
      await delay(DELAY_S * 1000);
    } else {
      break;
    }
  }

  if (typeof cb === "function") cb();
}
