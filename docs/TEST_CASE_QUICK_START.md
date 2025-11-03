# MCP Tool 测试用例管理 - 快速开始

## 系统架构

```
ToolStorage (数据存储)
    ├── testCases: TestCase[]     # 测试用例数组
    ├── currentToolName: string   # 当前工具名称
    ├── formData: object          # 表单数据
    └── lastToolCallResponse      # 最后执行结果

TestCase (单个测试用例)
    ├── id: string                # 唯一ID
    ├── name: string              # 名称
    ├── toolName: string          # 工具名
    ├── input: object             # 输入参数
    ├── actualOutput: object      # 实际输出
    └── status: string            # 状态
```

## 使用流程

### 场景1：从执行器创建测试用例

```
1. 用户在"运行调试"面板
   ↓
2. 填写工具参数并执行
   ↓
3. 查看执行结果
   ↓
4. 点击"保存为测试用例"
   ↓
5. 自动生成测试用例（包含输入和输出）
   ↓
6. 在"测试用例"面板可以看到新增的测试用例
```

### 场景2：手动创建测试用例

```
1. 用户切换到"测试用例"面板
   ↓
2. 点击"创建测试用例"按钮
   ↓
3. 填写表单：
   - 测试用例名称
   - 选择工具
   - 输入 JSON 格式的参数
   ↓
4. 点击"保存"
   ↓
5. 测试用例创建成功，状态为"待执行"
```

### 场景3：运行测试用例

```
1. 在测试用例列表中找到目标用例
   ↓
2. 点击"运行"按钮
   ↓
3. 系统调用对应的 MCP Tool
   ↓
4. 记录实际输出
   ↓
5. 更新测试状态（通过/失败）
   ↓
6. 点击用例卡片查看详细结果
```

### 场景4：批量测试

```
1. 点击"运行全部测试"按钮
   ↓
2. 系统遍历所有测试用例
   ↓
3. 依次执行每个测试
   ↓
4. 显示汇总统计：X 个通过，Y 个失败
```

## 核心函数说明

### 测试用例组件 (test-cases/index.vue)

```typescript
// 创建新测试用例
handleCreateTestCase() -> 打开创建对话框

// 编辑测试用例
handleEditTestCase(testCase) -> 打开编辑对话框

// 保存测试用例
handleSaveTestCase() -> 验证并保存到 testCases 数组

// 运行单个测试
handleRunTest(testCase) -> 调用 mcpClientAdapter.callTool()

// 批量运行
handleRunAllTests() -> 遍历并执行所有测试

// 删除测试用例
handleDeleteTestCase(id) -> 从数组中移除
```

### 工具执行器 (tool-executor.vue)

```typescript
// 执行工具
handleExecute() -> 调用工具并保存结果到 lastToolCallResponse

// 保存为测试用例
saveAsTestCase() -> 将当前输入输出保存为新测试用例
```

## 数据流向

```
用户操作
    ↓
Vue 组件事件处理
    ↓
更新 ToolStorage 数据
    ↓
调用 mcpClientAdapter
    ↓
与 MCP Server 通信
    ↓
返回结果并更新界面
```

## 示例：创建一个搜索用户的测试用例

### 输入参数示例
```json
{
  "email": "user@example.com",
  "includeInactive": false
}
```

### 预期输出示例
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\": 123, \"name\": \"John Doe\", \"email\": \"user@example.com\"}"
    }
  ],
  "isError": false
}
```

## 最佳实践

1. **命名规范**
   - 使用清晰的测试用例名称
   - 格式：`工具名_场景_预期结果`
   - 例如：`search_user_valid_email_success`

2. **参数设计**
   - 覆盖正常场景
   - 覆盖边界情况
   - 覆盖错误情况

3. **定期运行**
   - 开发新功能后批量运行测试
   - 修改现有工具后验证回归
   - 上线前执行完整测试套件

4. **维护测试用例**
   - 及时删除过时的测试用例
   - 更新不再有效的测试参数
   - 为新功能添加测试覆盖

## 技术要点

- **响应式数据**: 使用 Vue 的 reactive 确保界面实时更新
- **持久化**: 测试用例存储在 ToolStorage 中，随项目保存
- **异步执行**: 使用 async/await 处理工具调用
- **错误处理**: 捕获异常并标记测试失败
- **国际化**: 支持中英文界面

## 扩展建议

如果你需要增强功能，可以考虑：

1. **添加断言库**: 支持更复杂的输出验证
2. **导出功能**: 导出测试用例为 JSON 文件
3. **测试覆盖率**: 统计哪些工具有测试，哪些没有
4. **性能测试**: 记录工具执行时间
5. **历史记录**: 保存每次测试的执行历史
