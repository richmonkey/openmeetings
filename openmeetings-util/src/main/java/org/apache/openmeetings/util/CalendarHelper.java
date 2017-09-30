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
package org.apache.openmeetings.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;

public class CalendarHelper {
	public static ZoneId getZoneId(String tzId) {
		return ZoneId.of(tzId, ZoneId.SHORT_IDS);
	}

	public static Date getDate(LocalDate d, String tzId) {
		return getDate(d.atStartOfDay(), tzId);
	}

	public static Date getDate(LocalDateTime d, String tzId) {
		return new Date(d.atZone(getZoneId(tzId)).toInstant().toEpochMilli());
	}

	public static ZonedDateTime getZoneDateTime(Date d, String tzId) {
		if (d == null) {
			d = new Date();
		}
		return Instant.ofEpochMilli(d.getTime()).atZone(getZoneId(tzId));
	}

	public static LocalDate getDate(Date d, String tzId) {
		if (d == null) {
			d = new Date();
		}
		return getZoneDateTime(d, tzId).toLocalDate();
	}

	public static LocalDateTime getDateTime(Date d, String tzId) {
		if (d == null) {
			d = new Date();
		}
		return getZoneDateTime(d, tzId).toLocalDateTime();
	}
}
