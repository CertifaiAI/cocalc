/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
This is simply a list of *all* publicly shared files/directories,
with a simple page.  It is entirely meant to be walked by crawlers
such as Google, and only exists for that purpose.
*/

import Link from "next/link";
import SiteName from "components/site-name";
import getPool from "lib/database";

const PAGE_SIZE = 25;
const PRERENDER_PAGES = 10;

function getPage(obj): number {
  let { page } = obj ?? {};
  if (page == null) {
    return 1;
  }
  page = parseInt(page);
  if (isFinite(page)) {
    return Math.max(page, 1);
  }
  return 1;
}

export default function All({ page, rows }) {
  return (
    <div>
      <h1>
        All documents published on <SiteName />{" "}
      </h1>
      Page {page}
      &nbsp;&nbsp;
      {page > 1 ? (
        <Link href={`/all/${page - 1}`}>
          <a>Previous</a>
        </Link>
      ) : (
        <span style={{ color: "#888" }}>Previous</span>
      )}
      &nbsp;&nbsp;
      {rows != null && rows.length >= PAGE_SIZE ? (
        <Link href={`/all/${page + 1}`}>
          <a>Next</a>
        </Link>
      ) : (
        <span style={{ color: "#888" }}>Next</span>
      )}
      <h2>Documents</h2>
      {renderPublicProjects(rows)}
    </div>
  );
}

function renderPublicProjects(
  rows: {
    id?: string;
    path?: string;
    description?: string;
    last_edited?: number;
  }[]
): JSX.Element[] {
  const v: JSX.Element[] = [];
  for (const x of rows ?? []) {
    const { id, path, description, last_edited } = x;
    v.push(
      <pre key={id}>
        {id} {path} {description} {last_edited}
      </pre>
    );
  }
  return v;
}

export async function getStaticPaths() {
  const paths: any[] = [];
  for (let page = 1; page < PRERENDER_PAGES; page++) {
    paths.push({ params: { page: `${page}` } });
  }
  return { paths, fallback: true };
}

export async function getStaticProps(context) {
  const page = getPage(context.params);
  const pool = getPool();
  const {
    rows,
  } = await pool.query(
    "SELECT id, path, description, EXTRACT(EPOCH FROM last_edited)*1000 as last_edited FROM public_paths WHERE disabled IS NOT TRUE AND unlisted IS NOT TRUE ORDER BY last_edited DESC LIMIT $1 OFFSET $2",
    [PAGE_SIZE, PAGE_SIZE * (page - 1)]
  );

  return {
    props: { page, rows },
    revalidate: 10, // in production only queries once every 10s
  };
}
