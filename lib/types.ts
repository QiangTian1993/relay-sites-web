// 共享类型 —— 不依赖任何 server-only 模块（fs/path）
// data-loader / record-utils / utils / 所有 client 组件都从这里 import

/** KB 一条记录 = JSON 里任意对象，加 __id 字段 */
export type KeyedRecord = Record<string, unknown> & { __id: string };