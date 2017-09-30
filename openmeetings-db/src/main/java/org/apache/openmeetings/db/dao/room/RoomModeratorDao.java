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
package org.apache.openmeetings.db.dao.room;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.apache.openmeetings.db.entity.room.RoomModerator;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class RoomModeratorDao {
	@PersistenceContext
	private EntityManager em;

	public RoomModerator get(long id) {
		List<RoomModerator> list = em.createNamedQuery("getRoomModeratorById", RoomModerator.class)
				.setParameter("id", id).getResultList();
		if (!list.isEmpty()) {
			return list.get(0);
		}
		return null;
	}

	public List<RoomModerator> get(Collection<Long> ids) {
		return em.createNamedQuery("getRoomModeratorsByIds", RoomModerator.class).setParameter("ids", ids).getResultList();
	}

	public List<RoomModerator> getByRoomId(long roomId) {
		return em.createNamedQuery("getRoomModeratorByRoomId", RoomModerator.class).setParameter("roomId", roomId).getResultList();
	}

	/**
	 * @param userId unused
	 */
	public RoomModerator update(RoomModerator rm, Long userId) {
		if (rm.getId() == null) {
			rm.setInserted(new Date());
			em.persist(rm);
		} else {
			rm.setUpdated(new Date());
			rm = em.merge(rm);
		}
		return rm;
	}
}
