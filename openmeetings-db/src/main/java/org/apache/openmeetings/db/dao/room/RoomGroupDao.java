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

import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.apache.openmeetings.db.entity.room.RoomGroup;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class RoomGroupDao {
	@PersistenceContext
	private EntityManager em;

	public List<RoomGroup> get() {
		return em.createNamedQuery("getAllRoomGroups", RoomGroup.class).getResultList();
	}

	/**
	 * @param userId unused
	 */
	public RoomGroup update(RoomGroup entity, Long userId) {
		if (entity.getId() == null) {
			entity.setInserted(new Date());
			em.persist(entity);
		} else {
			entity.setUpdated(new Date());
			entity = em.merge(entity);
		}
		return entity;
	}

	public RoomGroup get(long groupId, long roomId) {
		List<RoomGroup> ll = em.createNamedQuery("getRoomGroupByGroupIdAndRoomId", RoomGroup.class)
				.setParameter("roomId", roomId)
				.setParameter("groupId", groupId)
				.getResultList();

		if (ll.size() > 0) {
			return ll.get(0);
		}
		return null;
	}
}
