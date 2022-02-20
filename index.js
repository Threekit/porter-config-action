const github = require("@actions/github");
const core = require("@actions/core");
const YAML = require("fs");
const fs = require("yaml");

const defaultDeployments = ["dev", "prod", "main", "staging"];

function prepHost(name, branch) {
  if (!branch?.length) return `${name}.3kit.com`;
  return `${name}.${branch}.3kit.com`;
}

function getPorterYml(hosts) {
  const porterConfig = {
    ingress: {
      custom_domain: true,
      hosts,
    },
  };
  return YAML.stringify(porterConfig);
}

async function run() {
  try {
    const myToken = core.getInput("token");
    const repo = core.getInput("repo-name");
    const output = core.getInput("output");
    const octokit = github.getOctokit(myToken);
    const { data } = await octokit.rest.repos.listBranches({
      owner: "Threekit",
      repo,
    });
    const branches = data.filter((el) => {
      if (defaultDeployments.includes(el.name)) return true;
      if (el.name.startsWith("feat-")) return true;
      return false;
    });

    const branchesOutput = JSON.stringify(JSON.stringify(branches));
    core.setOutput("branches", branchesOutput);
    if (output === "branches") return;

    const hosts = branches.map((el) => prepHost(repo, el.name));
    const devConfig = getPorterYml(hosts);
    const prodConfig = getPorterYml([prepHost(repo)]);

    fs.writeFileSync("./porter-dev.yaml", devConfig);
    fs.writeFileSync("./porter-prod.yaml", prodConfig);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
