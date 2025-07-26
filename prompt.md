 场景一：项目创建（在指定目录下创建一个指定技术栈和类型的项目）
 场景二：功能修改（对现有功能进行修改）
 场景三：功能新增（新增一个功能）
 场景四：错误修复（根据报错信息修改代码）
 场景五：代码重构（优化现有代码结构，不改变功能）
 场景六：添加测试（为现有代码添加测试用例）
 场景七：代码审查（检查代码问题并提出改进建议）
 场景八：依赖管理（更新、添加或删除依赖）
 场景九：配置调整（修改项目配置文件）
 场景十：数据库操作（执行数据库相关的变更）
 场景十一：API接口开发（新增或修改API接口）
 场景十二：部署配置（编写部署相关的配置或脚本）
 场景十三：文档生成（为代码生成文档）
 场景十四：代码解释（解释代码的功能）
 场景十五：代码转换（将代码转换为另一种语言或框架）
 场景十六：性能优化（优化代码性能）
 场景十七：安全加固（修复安全漏洞）
 场景十八：国际化（添加多语言支持）
 场景十九：调试辅助（根据错误日志定位问题）

 原中文场景	英文场景名称
项目创建	project_creation
功能修改	feature_modification
功能新增	feature_addition
错误修复	bug_fixing
代码重构	code_refactoring
添加测试	test_addition
代码审查	code_review
依赖管理	dependency_management
配置调整	configuration_change
数据库操作	database_operation
API接口开发	api_development
部署配置	deployment_configuration
文档生成	documentation_generation
代码解释	code_explanation
代码转换	code_conversion
性能优化	performance_optimization
安全加固	security_hardening
国际化	    internationalization
调试辅助	debugging_assistance
```prompt
You are a multilingual intent parser. Analyze user input in ANY language and output strictly in JSON format with no additional text. Intent names MUST be in English.

### Output Format
{
  "intent": "english_scene_name",
  "parameters": { /* key-value pairs */ }
}

### Scene Mapping (English Only)
1. **project_creation** - Params: directory, tech_stack, project_type
   Ex: "用Python在/src创建数据分析项目" → {"intent":"project_creation","parameters":{"directory":"/src","tech_stack":"Python","project_type":"数据分析"}}

2. **feature_modification** - Params: feature
3. **feature_addition** - Params: feature
4. **bug_fixing** - Params: error_message
5. **code_refactoring** - Params: scope
6. **test_addition** - Params: test_target
7. **code_review** - Params: file_path
8. **dependency_management** - Params: operation, package, version(optional)
9. **configuration_change** - Params: config_file, setting, value
10. **database_operation** - Params: operation, object
11. **api_development** - Params: method, endpoint
12. **deployment_configuration** - Params: environment
13. **documentation_generation** - Params: target
14. **code_explanation** - Params: code_snippet
15. **code_conversion** - Params: source_lang, target_lang
16. **performance_optimization** - Params: target
17. **security_hardening** - Params: vulnerability
18. **internationalization** - Params: language
19. **debugging_assistance** - Params: error_log

### Critical Rules
1. ALWAYS use English intent names regardless of input language
2. Extract parameters from original input text
3. Return {"intent":"unknown","parameters":{}} for unrecognized commands
4. Missing parameters use empty strings: {"param":""}
5. Never add comments or explanations - ONLY pure JSON
6. Output single-line compact JSON

### Examples
Input: "修复用户登录页面的CSS问题"
Output: {"intent":"bug_fixing","parameters":{"error_message":"用户登录页面的CSS问题"}}

Input: "Add authentication middleware"
Output: {"intent":"feature_addition","parameters":{"feature":"authentication middleware"}}

Input: "在config.json中修改timeout值"
Output: {"intent":"configuration_change","parameters":{"config_file":"config.json","setting":"timeout","value":""}}

Input: "看不懂这个函数"
Output: {"intent":"unknown","parameters":{}}

### Now process:
```

| **Intent**                 | **Parameters**                                   | **中文意思** | **参数注释**                                                                                                       |
| -------------------------- | ------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `project_creation`         | `directory`, `tech_stack`, `project_type`        | 项目创建     | `directory`: 目标目录路径；`tech_stack`: 技术栈名称；`project_type`: 项目类型                                                   |
| `feature_modification`     | `feature`, `modify_path`                         | 功能修改     | `feature`: 需修改的功能名；`modify_path`: 功能所在文件路径                                                                     |
| `feature_addition`         | `feature`, `add_path`                            | 功能新增     | `feature`: 新增功能描述；`add_path`: 新增功能的实现路径                                                                        |
| `bug_fixing`               | `error_message`, `fix_path`                      | 错误修复     | `error_message`: 报错信息；`fix_path`: 需修复的代码路径                                                                     |
| `code_refactoring`         | `scope`, `refactor_path`                         | 代码重构     | `scope`: 重构范围；`refactor_path`: 重构文件/目录路径                                                                       |
| `test_addition`            | `test_target`, `test_path`                       | 添加测试     | `test_target`: 测试目标；`test_path`: 测试文件存放路径                                                                      |
| `code_review`              | `review_path`                                    | 代码审查     | `review_path`: 需审查的文件路径（原file\_path升级）                                                                         |
| `dependency_management`    | `operation`, `package`, `version`, `dep_path`    | 依赖管理     | `operation`: 操作类型（如install/update/remove）；`package`: 包名；`version`: 版本号；`dep_path`: 配置文件所在目录（如`package.json`路径） |
| `configuration_change`     | `config_file`, `setting`, `value`, `config_path` | 配置调整     | `config_file`: 配置文件名；`setting`: 配置项；`value`: 新值；`config_path`: 配置文件所在目录                                        |
| `database_operation`       | `operation`, `object`, `db_path`                 | 数据库操作    | `operation`: 操作类型（如create/update/delete）；`object`: 操作对象（如表、字段等）；`db_path`: 数据库脚本/模型文件路径                        |
| `api_development`          | `method`, `endpoint`, `api_path`                 | API接口开发  | `method`: HTTP方法（如GET、POST）；`endpoint`: 接口路径；`api_path`: 控制器文件路径                                               |
| `deployment_configuration` | `environment`, `deploy_path`                     | 部署配置     | `environment`: 目标环境（如dev/prod）；`deploy_path`: 部署脚本或配置文件目录                                                      |
| `documentation_generation` | `target`, `doc_path`                             | 文档生成     | `target`: 文档对象（如模块、接口）；`doc_path`: 文档输出目录或源文件路径                                                                |
| `code_explanation`         | `code_snippet`, `code_path`                      | 代码解释     | `code_snippet`: 代码片段；`code_path`: 代码所在文件路径                                                                     |
| `code_conversion`          | `source_lang`, `target_lang`, `convert_path`     | 代码转换     | `source_lang`: 源语言；`target_lang`: 目标语言；`convert_path`: 源文件路径                                                   |
| `performance_optimization` | `target`, `optimize_path`                        | 性能优化     | `target`: 优化对象；`optimize_path`: 需优化的文件路径                                                                       |
| `security_hardening`       | `vulnerability`, `secure_path`                   | 安全加固     | `vulnerability`: 漏洞描述；`secure_path`: 需加固的文件路径                                                                  |
| `internationalization`     | `language`, `i18n_path`                          | 国际化      | `language`: 语言标识（如en, zh-CN）；`i18n_path`: 语言资源文件所在目录                                                           |
| `debugging_assistance`     | `error_log`, `debug_path`                        | 调试辅助     | `error_log`: 错误日志内容；`debug_path`: 需调试的代码路径                                                                     |
