export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // One scope per skill, plus the repo itself. Add a scope when a skill is added.
    'scope-enum': [2, 'always', ['repo', 'docs', 'ci', 'deps', 'init-project', 'deliver-loop']],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [1, 'always', 100],
  },
};
