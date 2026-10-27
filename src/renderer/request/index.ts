/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ApiError, get, post } from "@/renderer/utils/request"
import type {
	ResearchDownloadLinkResponse,
	ResearchListResponse,
	ResearchTicketResponse,
} from "@/renderer/types/research"
import type {
	CreditBalanceResponse,
	CreditChangeType,
	CreditLedgerResponse,
} from "@/shared/types"

const { rendererLog } = window.electronAPI

export const postUserAction = async (data: {
	role: string
	action: string
}) => {
	try {
		return await post("/api/data/data_client_record/create", data)
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
						requestData: data,
					},
					null,
					2,
				)}`,
			)
		} else {
			rendererLog(
				"error",
				`[postUserAction] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
	}
}

export const getStatusExpires = async () => {
	try {
		return await get("/api/data/query/user/data_api/valid_to")
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`[getStatusExpires] 请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
					},
					null,
					2,
				)}`,
			)
			return {
				code: 400,
				message:
					typeof error.data === "string"
						? error.data
						: JSON.stringify(error.data),
			}
		} else {
			rendererLog(
				"error",
				`[getStatusExpires] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
			return {
				code: 400,
				message: error instanceof Error ? error.message : String(error),
			}
		}
	}
}

export const getCreditBalance = async (): Promise<CreditBalanceResponse | null> => {
	try {
		return await get<CreditBalanceResponse>("/api/user/get/credit-balance")
	} catch (error) {
		if (
			error instanceof ApiError &&
			(error.status === 401 || error.status === 403)
		) {
			return null
		}
		throw error
	}
}

export const getCreditLedger = async (params?: {
	page?: number
	size?: number
	change_type?: CreditChangeType
}): Promise<CreditLedgerResponse | null> => {
	try {
		return await get<CreditLedgerResponse>("/api/user/get/credit-ledger", {
				page: params?.page ?? 1,
				size: params?.size ?? 20,
				change_type: params?.change_type,
			},
		)
	} catch (error) {
		if (
			error instanceof ApiError &&
			(error.status === 401 || error.status === 403)
		) {
			return null
		}
		throw error
	}
}

export const getExtraWorkStatus = async () => {
	try {
		return await get("/api/data/query/user/elective_hw")
	} catch (error) {
		if (error instanceof ApiError) {
			rendererLog(
				"error",
				`[getExtraWorkStatus] 请求失败 ${JSON.stringify(
					{
						status: error.status,
						error: error.data,
					},
					null,
					2,
				)}`,
			)
		} else {
			rendererLog(
				"error",
				`[getExtraWorkStatus] 请求异常: ${JSON.stringify(error, null, 2)}`,
			)
		}
		return { data: false }
	}
}

// -- 研究中心：精心随机策略库 & 框架源码
const buildResearchHandler =
	(urlBuilder: (courseName: string) => string) =>
	async (courseName: string): Promise<ResearchListResponse> => {
		try {
			return await get<ResearchListResponse>(urlBuilder(courseName))
		} catch (error) {
			if (error instanceof ApiError) {
				return {
					code: error.status,
					data: [],
					message:
						typeof error.data === "string"
							? error.data
							: JSON.stringify(error.data),
				}
			}
			return {
				code: 500,
				data: [],
				message: error instanceof Error ? error.message : String(error),
			}
		}
	}

export const getResearchStrategies = buildResearchHandler(
	(courseName) => `/download/stock-data-client/strategies/${courseName}`,
)

export const getResearchBasicCode = buildResearchHandler(
	(courseName) => `/download/stock-data-client/basic-code/${courseName}`,
)

export const postResearchTicket = (fid: string) =>
	post<ResearchTicketResponse>(`/download/${fid}/basic-code-download`, {
		method: "link",
	})

export const getResearchDownloadLink = (ticket: string) =>
	get<ResearchDownloadLinkResponse>(
		`/download/get-code-download-link/${ticket}`,
	)
