/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License") +  you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.openmeetings.db.util;

import java.util.ArrayList;
import java.util.Collection;

import com.github.openjson.JSONArray;
import com.github.openjson.JSONObject;

public class DtoHelper {
	public static Integer optInt(JSONObject o, String key) {
		return o.has(key) && !o.isNull(key) ? o.getInt(key) : null;
	}

	public static Long optLong(JSONObject o, String key) {
		return o.has(key) && !o.isNull(key) ? o.getLong(key) : null;
	}

	public static <T extends Enum<T>> T optEnum(Class<T> clazz, JSONObject o, String key) {
		return o.has(key) && !o.isNull(key) ? Enum.valueOf(clazz, o.getString(key)) : null;
	}

	public static <T extends Enum<T>> Collection<T> optEnumList(Class<T> clazz, JSONArray arr) {
		Collection<T> l = new ArrayList<>();
		if (arr !=  null) {
			for (int i = 0; i < arr.length(); ++i) {
				l.add(Enum.valueOf(clazz, arr.getString(i)));
			}
		}
		return l;
	}
}
