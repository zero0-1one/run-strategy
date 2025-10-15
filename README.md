# Run Strategy

NodeJs 的异步任务执行常见策略：

- `Waiting：` 等待任务完成
- `Retry：` 重试任务
- `QueueExecutor：` 排队执行任务
- `RunLast：` 排队执行，但是等待中的只会执行最后一个，其他忽略。
