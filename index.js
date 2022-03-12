const github = require("@actions/github");
const core = require("@actions/core");
const YAML = require("yaml");
const fs = require("fs");

const defaultDeployments = ["dev", "prod", "main", "staging"];

function prepHost(name, branch) {
  if (!name?.length) return `${name}.3kit.com`;
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
    const projectName = repo.includes("--") ? repo.split("--")[1] : repo;
    const output = core.getInput("output");
    const ref = core.getInput("ref");
    const octokit = github.getOctokit(myToken);

    const isNotInitialized = fs.existsSync(
      "./.github/workflows/treble-launchpad-init.yml"
    );
    const isRepoEmpty = !fs.existsSync("./package.json");
    let isNonDeployBranch = false;

    if (ref?.length) {
      if (!defaultDeployments.includes(ref) && !ref.startsWith("feat-")) {
        isNonDeployBranch = true;
      }
    }

    const { data } = await octokit.rest.repos.listBranches({
      owner: "Threekit",
      repo,
    });
    const branches = data
      .filter((el) => {
        if (defaultDeployments.includes(el.name)) return true;
        if (el.name.startsWith("feat-")) return true;
        return false;
      })
      .map((el) => el.name);

    const hosts = branches.map((el) => prepHost(projectName, el));
    const devConfig = getPorterYml(hosts);
    const prodConfig = getPorterYml([prepHost(projectName)]);

    const branchesOutput = JSON.stringify(JSON.stringify(branches));

    if (output === "config") {
      fs.writeFileSync("./porter-dev.yaml", devConfig);
      fs.writeFileSync("./porter-prod.yaml", prodConfig);
    }

    core.setOutput("project-name", projectName);

    if (isNotInitialized || isRepoEmpty || isNonDeployBranch) {
      core.setOutput("branches", JSON.stringify(JSON.stringify([])));
      return;
    }

    core.setOutput("branches", branchesOutput);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
