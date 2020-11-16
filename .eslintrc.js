module.exports = {
  'parser': '@typescript-eslint/parser'
  ,'plugins': ['@typescript-eslint' ,'import']
  ,'extends': [
    "oclif",
    "oclif-typescript",
    '@tdi/base',
    ]
  ,'parserOptions': {
    ecmaVersion: 2021
    ,project: ['./**/tsconfig.json']
    ,sourceType: 'module'
    ,ecmaFeatures: {
      globalReturn: false
      ,jsx: false
      ,impliedStrict: false
    }
  }
  ,'settings': {
    'import/resolver': {
      node: {
        extensions: ['.js' ,'.jsx' ,'.ts' ,'.d.ts' ,'.tsx' ,'.json']
        // moduleDirectory: ['node_modules','src']
      }
    }
  }
  ,'env': { node: true }
  ,'rules': {
    // This project overrides
    'no-template-curly-in-string': ['off'],
    // My unicorn has been abused and now flags things erroneously.
    // Will need to debug the rule latter
    'unicorn/no-abusive-eslint-disable': ['off']
    // Javascript
    // ,'lines-between-class-members': ['error' ,'never' ,{ exceptAfterSingleLine: true }]
    
  }
}
