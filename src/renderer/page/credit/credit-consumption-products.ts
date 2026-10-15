export interface CreditConsumptionProduct {
	displayName: string
	name: string
	full: string
	incremental: string
}

export const BASIC_CREDIT_PRODUCTS: CreditConsumptionProduct[] = [
	{
		displayName: "邢不行财务数据",
		name: "stock-fin-data-xbx-daily",
		full: "47.04",
		incremental: "0.588",
	},
	{
		displayName: "主要指数历史日线数据",
		name: "stock-main-index-data-daily",
		full: "0.08",
		incremental: "0.001",
	},
	{
		displayName: "股票历史日线数据",
		name: "stock-trading-data-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "ETF基金日线数据",
		name: "stock-etf-trading-data-daily",
		full: "7.04",
		incremental: "0.088",
	},
]

/** 分享会数据产品积分消耗（来源：数据产品积分定价表） */
export const SHARE_MEETING_CREDIT_PRODUCTS: CreditConsumptionProduct[] = [
	{
		displayName: "etf一小时交易数据",
		name: "stock-etf-1h-trading-data-daily",
		full: "21.28",
		incremental: "0.266",
	},
	{
		displayName: "筹码分布市场数据",
		name: "stock-chip-distribution-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "主要指数历史日线数据",
		name: "stock-main-index-data-daily",
		full: "0.08",
		incremental: "0.001",
	},
	{
		displayName: "邢不行财务预告数据",
		name: "stock-fin-pre-fore-data-xbx-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "股票1小时K线数据",
		name: "stock-1h-trading-data-daily",
		full: "21.28",
		incremental: "0.266",
	},
	{
		displayName: "指数1小时K线数据",
		name: "stock-1h-index-data-daily",
		full: "0.48",
		incremental: "0.006",
	},
	{
		displayName: "股票1小时k线数据Pro",
		name: "stock-1h-trading-data-pro-daily",
		full: "23.04",
		incremental: "0.288",
	},
	{
		displayName: "ETF基金日线数据",
		name: "stock-etf-trading-data-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "股票历史日线数据",
		name: "stock-trading-data-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "股票历史全息日线数据",
		name: "stock-trading-data-pro-daily",
		full: "47.04",
		incremental: "0.588",
	},
	{
		displayName: "邢不行资金流数据",
		name: "stock-money-flow-xbx-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "QuantClass选股策略汇总",
		name: "stock-equity-daily",
		full: "53.28",
		incremental: "0.666",
	},
	{
		displayName: "热门股票数据",
		name: "stock-xueqiu-hot-stock-daily",
		full: "31.92",
		incremental: "0.399",
	},
	{
		displayName: "CNY汇率数据",
		name: "stock-cny-rate-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "AH港股数据",
		name: "stock-hk-stock-data-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "财务预处理数据",
		name: "stock-fin-pre-data-sina-daily",
		full: "7.04",
		incremental: "0.088",
	},
	{
		displayName: "分析师评级数据",
		name: "stock-analyst-ranking-daily",
		full: "21.28",
		incremental: "0.266",
	},
	{
		displayName: "龙虎榜机构持仓数据",
		name: "stock-lhb-organ-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "可转债行情数据",
		name: "stock-basic-bond-daily",
		full: "21.28",
		incremental: "0.266",
	},
	{
		displayName: "机构调研数据",
		name: "stock-activation-records-daily",
		full: "31.04",
		incremental: "0.388",
	},
	{
		displayName: "机构预测数据",
		name: "stock-analyst-predicted-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "指数成分股资金曲线",
		name: "stock-ind-element-equity-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "大类资产",
		name: "stock-asset-classification-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "个股分红数据",
		name: "stock-dividend-delivery-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "每日A股股票汇总",
		name: "stock-trading-date-daily",
		full: "0.1592",
		incremental: "0.002",
	},
	{
		displayName: "美股分红数据",
		name: "stock-us-dividend-delivery-data-daily",
		full: "23.84",
		incremental: "0.298",
	},
	{
		displayName: "股票公告标题汇总",
		name: "stock-notices-title-daily",
		full: "21.28",
		incremental: "0.266",
	},
	{
		displayName: "股票5分钟收盘价",
		name: "stock-5m-close-price-daily",
		full: "15.92",
		incremental: "0.199",
	},
	{
		displayName: "股票15分钟收盘价",
		name: "stock-15m-close-price-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "etf5分钟收盘价",
		name: "stock-etf-5m-close-price-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "资金流数据",
		name: "stock-money-flow-daily",
		full: "15.04",
		incremental: "0.188",
	},
	{
		displayName: "邢不行财务数据",
		name: "stock-fin-data-xbx-daily",
		full: "47.04",
		incremental: "0.588",
	},
	{
		displayName: "摆动指标因子",
		name: "stock-oscillator-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "技术指标因子",
		name: "stock-technical-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "反趋向指标因子",
		name: "stock-anti-trend-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "量价指标因子",
		name: "stock-volume-price-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "能量指标因子",
		name: "stock-energy-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "趋向指标因子",
		name: "stock-trend-factors-daily",
		full: "16.48",
		incremental: "0.206",
	},
	{
		displayName: "多因子系列",
		name: "stock-multi-factor-series-daily",
		full: "16.48",
		incremental: "0.206",
	},
]
