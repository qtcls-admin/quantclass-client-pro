/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { SelectStgFormData } from "@/renderer/page/strategy/types"
import type { UseFormReturn } from "react-hook-form"

export const useFormValidation = (_form: UseFormReturn<SelectStgFormData>) => {
	const validateFormData = async (_data: SelectStgFormData) => {
		return true
	}

	return {
		validateFormData,
	}
}
