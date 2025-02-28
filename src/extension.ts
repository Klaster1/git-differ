import * as vscode from "vscode";
import { API, GitExtension, Ref } from "./git";

export function activate(context: vscode.ExtensionContext) {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git")!.exports;
  const gitApi: API = gitExtension.getAPI(1);

  const config = vscode.workspace.getConfiguration("git-differ");
  const localOnly = config.get<boolean>("localOnly", false);

  const compareWithBranch = vscode.commands.registerCommand(
    "git-differ.compareWithBranch",
    async (uri: vscode.Uri) => {
      const branches = await getBranches(gitApi, uri, !localOnly);
      const branchNames = branches
        .map((branch) => branch.name)
        .filter((name): name is string => !!name);

      const selectedBranchName = await vscode.window.showQuickPick(
        branchNames,
        {
          placeHolder: "Select a branch to compare with",
        }
      );

      if (!selectedBranchName) {
        vscode.window.showErrorMessage("No branch selected");
        return;
      }

      const branch = branches.find(
        (branch) => branch.name === selectedBranchName
      );
      if (!branch) {
        vscode.window.showErrorMessage(
          `Branch not found: ${selectedBranchName}`
        );
        return;
      }

      if (branch.name === undefined) {
        vscode.window.showErrorMessage(
          `Branch Name is undefined: ${selectedBranchName}`
        );
        return;
      }

      const gitUri = gitApi.toGitUri(uri, branch.name);
      const filePath = uri.path.split("/").pop() || uri.path;

      vscode.commands.executeCommand(
        "vscode.diff",
        gitUri,
        uri,
        `${branch.name} compared with "${filePath}"`
      );
    }
  );

  context.subscriptions.push(compareWithBranch);
}

export function deactivate() {}

async function getBranches(
  gitApi: API,
  uri: vscode.Uri,
  remote: boolean
): Promise<Ref[]> {
  const repo = gitApi.getRepository(uri);

  if (!repo) {
    vscode.window.showErrorMessage(
      `Repository not found for URI: ${uri.toString()}`
    );
    return [];
  }

  return await repo.getBranches({ remote });
}
