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

import java.util.Calendar;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;

import org.apache.openmeetings.db.dao.IDataProviderDao;
import org.apache.openmeetings.db.entity.basic.MailMessage;
import org.apache.openmeetings.db.entity.basic.MailMessage.Status;
import org.apache.wicket.util.string.Strings;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class MailMessageDao  implements IDataProviderDao<MailMessage> {
	@PersistenceContext
	private EntityManager em;

	@Override
	public MailMessage get(long id) {
		return get(Long.valueOf(id));
	}

	@Override
	public MailMessage get(Long id) {
		return em.createNamedQuery("getMailMessageById", MailMessage.class).setParameter("id", id).getSingleResult();
	}

	@Override
	public List<MailMessage> get(int start, int count) {
		return em.createNamedQuery("getMailMessages", MailMessage.class)
				.setFirstResult(start).setMaxResults(count).getResultList();
	}

	public List<MailMessage> get(int start, int count, Status status) {
		return em.createNamedQuery("getMailMessagesByStatus", MailMessage.class).setParameter("status", status)
				.setFirstResult(start).setMaxResults(count).getResultList();
	}

	private <T> TypedQuery<T> getQuery(boolean isCount, String search, String order, Class<T> clazz) {
		StringBuilder sb = new StringBuilder("SELECT ");
		sb.append(isCount ? "COUNT(m)" : "m")
			.append(" FROM MailMessage m");
		if (!Strings.isEmpty(search)) {
			sb.append(" WHERE m.recipients LIKE :search OR m.subject LIKE :search OR m.body LIKE :search OR m.lastError LIKE :search");
		}
		if (!Strings.isEmpty(order)) {
			sb.append(" ORDER BY m.").append(order);
		}
		TypedQuery<T> q = em.createQuery(sb.toString(), clazz);
		if (!Strings.isEmpty(search)) {
			q.setParameter("search", String.format("%%%s%%", search));
		}
		return q;
	}

	@Override
	public List<MailMessage> get(String search, int start, int count, String order) {
		return getQuery(false, search, order, MailMessage.class).setFirstResult(start).setMaxResults(count).getResultList();
	}

	@Override
	public long count() {
		return em.createNamedQuery("countMailMessages", Long.class).getSingleResult();
	}

	@Override
	public long count(String search) {
		return getQuery(true, search, null, Long.class).getSingleResult();
	}

	public void resetSendingStatus(Calendar date) {
		em.createNamedQuery("resetMailStatusByDate")
			.setParameter("noneStatus", Status.NONE)
			.setParameter("sendingStatus", Status.SENDING)
			.setParameter("date", date)
			.executeUpdate();
	}

	public void resetSendingStatus(Long id) {
		em.createNamedQuery("resetMailStatusById")
			.setParameter("noneStatus", Status.NONE)
			.setParameter("id", id)
			.executeUpdate();
	}

	@Override
	public MailMessage update(MailMessage m, Long userId) {
		if (m.getId() == null) {
			m.setInserted(Calendar.getInstance());
			em.persist(m);
		} else {
			m.setUpdated(Calendar.getInstance());
			m = em.merge(m);
		}
		return m;
	}

	@Override
	public void delete(MailMessage m, Long userId) {
		if (m != null) {
			delete(m.getId(), userId);
		}
	}

	/**
	 * @param id - entity id
	 * @param userId - unused
	 */
	public void delete(Long id, Long userId) {
		if (id != null) {
			em.remove(get(id));
		}
	}
}
