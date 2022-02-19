const core = require("@actions/core");
// const github = require("@actions/github");
const YAML = require("yaml");
const fs = require("fs");

function prepHosts(projectName, isDev) {
  if (!isDev) return [`${projectName}.3kit.com`];
  return ["main", "prod", "dev", "staging"].reduce((output, branch) => {
    output.push(`${projectName}.${branch}.3kit.com`);
    return output;
  }, []);
}

function getPorterConfig(projectName, isDev) {
  const porterConfig = {
    ingress: {
      custom_domain: true,
      hosts: prepHosts(projectName, isDev),
    },
  };
  return YAML.stringify(porterConfig);
}

try {
  // `project-name` input defined in action metadata file
  const projectName = core.getInput("project-name");
  const isDev = core.getInput("env") === "dev";

  const ymlConfig = getPorterConfig(projectName, isDev);

  fs.writeFileSync("./porter.yaml", ymlConfig);
} catch (error) {
  core.setFailed(error.message);
}
