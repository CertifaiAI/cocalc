import { Set as immutableSet } from "immutable";
import { parse_hashtags, search_match, search_split } from "smc-util/misc";
import { webapp_client } from "../webapp-client";

function parse_tags(info): string[] {
  const indices = parse_hashtags(info);
  return Array.from(new Set(indices.map((i) => info.substring(i[0], i[1]))));
}

function hashtags_to_string(tags: Set<string> | string[] | undefined): string {
  if (tags == null) return "";
  tags = Array.from(tags);
  if (tags.length == 0) return "";
  return "#" + tags.join(" #");
}

let search_cache: {
  [project_id: string]: string;
} = {};
let last_project_map: any = null;
let last_user_map: any = null;

function get_search_info(project_id, project, user_map): string {
  let s: undefined | string = search_cache[project_id];
  if (s != null) {
    return s;
  }
  s = (project.get("title") + " " + project.get("description")).toLowerCase();
  s = s + " " + hashtags_to_string(parse_tags(s));
  if (user_map != null) {
    project.get("users")?.forEach((_, account_id) => {
      if (account_id == webapp_client.account_id) return;
      const info = user_map.get(account_id);
      if (info != null) {
        s += (
          " " +
          info.get("first_name") +
          " " +
          info.get("last_name") +
          " "
        ).toLowerCase();
      }
    });
  }
  return (search_cache[project_id] = s);
}

export function get_visible_projects(
  project_map,
  user_map,
  hashtags: immutableSet<string> | undefined,
  search: string,
  sort_by: "user_last_active" | "last_active" | "title" | "state"
): string[] {
  const visible_projects: string[] = [];
  if (project_map == null) return visible_projects;
  if (project_map != last_project_map || user_map != last_user_map) {
    console.log("clearing search_cache");
    search_cache = {};
  }
  last_project_map = project_map;
  last_user_map = user_map;
  const words = search_split(
    search + " " + hashtags_to_string(hashtags?.toJS())
  );
  project_map.forEach((project, project_id) => {
    if (search_match(get_search_info(project_id, project, user_map), words)) {
      visible_projects.push(project_id);
    }
  });
  return visible_projects;
}

export function get_visible_hashtags(project_map, visible_projects): string[] {
  if (project_map == null) return [];
  const tags = new Set();
  for (const project_id of visible_projects) {
    const project = project_map.get(project_id);
    if (project == null) continue;
    for (const tag of parse_tags(
      (
        project.get("title", "") +
        " " +
        project.get("description", "")
      ).toLowerCase()
    )) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort() as string[];
}