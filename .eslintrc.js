/*
 * Eslint config file
 * Documentation: https://eslint.org/docs/user-guide/configuring/
 * Install the Eslint extension before using this feature.
 */
module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  globals: {
    wx: true,
    App: true,
    Page: true,
    getCurrentPages: true,
    getApp: true,
    Component: true,
    requirePlugin: true,
    requireMiniProgram: true,
  },
  extends: ['eslint-config-airbnb-base', 'eslint-config-prettier'],
  plugins: ['prettier', 'import'],
  // extends: 'eslint:recommended',
  rules: {
    'import/order': [
      'error',
      {
        groups: [
          'builtin', // Built-in types are first
          'external', // Then the index file
          'internal',
        ],
      },
    ],
    // 非开发模式禁用debugger
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    // 允许调用首字母大写的函数时没有 new 操作符
    'new-cap': 'off',
    // 在工具库中允许变量以下划线开头
    'no-underscore-dangle': 'off',
    // 在工具库中允许参数重新赋值
    'no-param-reassign': 'off',
    'number-leading-zero': 'off',
    eqeqeq: [
      'error',
      'always',
      {
        null: 'ignore',
      },
    ],
    'import/no-unresolved': 0,
    'import/prefer-default-export': 0,
    'import/no-named-as-default': 0,
    'import/extensions': 0,
    'import/export': 0,
    'import/no-cycle': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
    'import/no-dynamic-require': 0,
    'object-shorthand': 0,
    'no-shadow': 0,
    'no-unused-expressions': 0,
    // R5-3 漂移兜底：挡未用变量（catch 绑定/函数参数/解构去字段/下划线前缀豁免）
    'no-unused-vars': [
      'error',
      {
        args: 'none',
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'consistent-return': 0,
    'no-return-assign': 0,
    'func-names': 0,
    'class-methods-use-this': 0,
    'no-console': [
      2,
      {
        allow: ['warn', 'error'],
      },
    ],
    'no-undef': 0,
    'no-proto': 0,
  },
  // 页面已全量转 .ts（R2）：让校对员也看得懂 .ts，补回「重复方法/未用变量」兜底。
  // 仅语法级 lint（不接 type-aware，保持快、无需给全项目补类型）。
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      rules: {
        // 基础 no-unused-vars 关掉，交给 TS 版（同样的务实豁免）
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'none',
            caughtErrors: 'none',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
        // 重复方法/成员：Page({}) 里重复方法=重复 key，由 no-dupe-keys 兜（核心规则）
        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': 'error',
        // 定位为「抓 bug 的兜底」而非「重排版」：关掉纯风格规则，避免把从未 lint 过的
        // .ts（models/sub-pages 等）逼着全量改格式。格式仍由开发者工具/prettier 负责。
        'lines-between-class-members': 'off',
        'no-use-before-define': 'off',
        'arrow-body-style': 'off',
        'prefer-destructuring': 'off',
        'no-nested-ternary': 'off',
        'max-classes-per-file': 'off',
        'no-plusplus': 'off',
      },
    },
  ],
};
