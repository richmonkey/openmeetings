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
package org.apache.openmeetings.db.dao.basic;

import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.apache.openmeetings.db.entity.basic.ChatMessage;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class ChatDao {
	@PersistenceContext
	private EntityManager em;

	public ChatMessage get(long id) {
		return em.createNamedQuery("getChatMessageById", ChatMessage.class)
				.setParameter("id", id)
				.getSingleResult();
	}

	//for export
	public List<ChatMessage> get(int start, int count) {
		return em.createNamedQuery("getGlobalChatMessages", ChatMessage.class)
				.setFirstResult(start)
				.setMaxResults(count)
				.getResultList();
	}

	public List<ChatMessage> getGlobal(int start, int count) {
		return em.createNamedQuery("getGlobalChatMessages", ChatMessage.class)
				.setFirstResult(start)
				.setMaxResults(count)
				.getResultList();
	}

	public List<ChatMessage> getRoom(long roomId, int start, int count, boolean all) {
		return em.createNamedQuery("getChatMessagesByRoom", ChatMessage.class)
				.setParameter("roomId", roomId)
				.setParameter("all", all)
				.setFirstResult(start)
				.setMaxResults(count)
				.getResultList();
	}

	public List<ChatMessage> getUser(long userId, int start, int count) {
		return em.createNamedQuery("getChatMessagesByUser", ChatMessage.class)
				.setParameter("userId", userId)
				.setFirstResult(start)
				.setMaxResults(count)
				.getResultList();
	}

	public List<ChatMessage> getUserRecent(long userId, Date date, int start, int count) {
		return em.createNamedQuery("getChatMessagesByUserTime", ChatMessage.class)
				.setParameter("userId", userId)
				.setParameter("date", date)
				.setFirstResult(start)
				.setMaxResults(count)
				.getResultList();
	}

	public ChatMessage update(ChatMessage entity) {
		entity.setSent(new Date());
		if (entity.getId() == null) {
			em.persist(entity);
		}
		return entity;
	}

	/**
	 * @param entity - unused
	 * @param userId - unused
	 */
	public void delete(ChatMessage entity, long userId) {
		// TODO Auto-generated method stub
	}

	public void deleteGlobal() {
		em.createNamedQuery("deleteChatGlobal").executeUpdate();
	}

	public void deleteRoom(Long roomId) {
		em.createNamedQuery("deleteChatRoom").setParameter("roomId", roomId).executeUpdate();
	}

	public void deleteUser(Long userId) {
		em.createNamedQuery("deleteChatUser").setParameter("userId", userId).executeUpdate();
	}
}
