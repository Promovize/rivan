export enum PullRequestState {
  OPEN = "OPEN",
  MERGED = "MERGED",
  DECLINED = "DECLINED",
}

export type PullRequestEventData = {
  comment_count: number;
  task_count: number;
  type: string;
  id: number;
  title: string;
  description: string;
  rendered: { title: any; description: any };
  state: PullRequestState;
  merge_commit: any;
  close_source_branch: boolean;
  closed_by: any;
  author: Author;
};

export type Author = {
  display_name: string;
  links: any[];
  type: "user";
  uuid: string;
  account_id: string;
  nickname: string;
};
