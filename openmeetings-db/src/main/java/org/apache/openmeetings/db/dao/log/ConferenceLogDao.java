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
package org.apache.openmeetings.db.dao.log;

import static org.apache.openmeetings.util.OpenmeetingsVariables.webAppRootKey;

import java.util.Date;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.apache.openmeetings.db.entity.log.ConferenceLog;
import org.apache.openmeetings.db.entity.log.ConferenceLog.Type;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class ConferenceLogDao {
	private static final Logger log = Red5LoggerFactory.getLogger(ConferenceLogDao.class, webAppRootKey);

	@PersistenceContext
	private EntityManager em;

	public ConferenceLog add(Type type, Long userId, String streamid, Long roomId, String userip, String scopeName) {
		ConferenceLog confLog = new ConferenceLog();
		confLog.setType(type);
		confLog.setInserted(new Date());
		confLog.setUserId(userId);
		confLog.setStreamid(streamid);
		confLog.setScopeName(scopeName);
		confLog.setRoomId(roomId);
		confLog.setUserip(userip);

		em.persist(confLog);
		log.debug("[addConferenceLog]: " + confLog);
		return confLog;
	}
}
