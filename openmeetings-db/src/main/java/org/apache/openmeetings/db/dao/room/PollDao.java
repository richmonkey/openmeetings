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

import static org.apache.openmeetings.util.OpenmeetingsVariables.webAppRootKey;

import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;

import org.apache.openmeetings.db.entity.room.RoomPoll;
import org.apache.openmeetings.db.entity.room.RoomPollAnswer;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class PollDao {
	private static final Logger log = Red5LoggerFactory.getLogger(PollDao.class, webAppRootKey);

	@PersistenceContext
	private EntityManager em;

	public RoomPoll update(RoomPoll p) {
		if (p.getId() == null) {
			p.setCreated(new Date());
			em.persist(p);
		} else {
			p = em.merge(p);
		}
		return p;
	}

	public boolean close(Long roomId) {
		try {
			log.debug(" :: close :: ");
			Query q = em.createNamedQuery("closePoll");
			q.setParameter("roomId", roomId);
			q.setParameter("archived", true);
			return q.executeUpdate() > 0;
		} catch (Exception err) {
			log.error("[close]", err);
		}
		return false;
	}

	public boolean delete(RoomPoll p) {
		try {
			log.debug(" :: delete :: ");
			Query q = em.createNamedQuery("deletePoll");
			q.setParameter("id", p.getId());
			return q.executeUpdate() > 0;
		} catch (Exception err) {
			log.error("[delete]", err);
		}
		return false;
	}

	public RoomPoll get(Long id) {
		List<RoomPoll> list = em.createNamedQuery("getPollById", RoomPoll.class).setParameter("id", id).getResultList();
		return list.isEmpty() ? null : list.get(0);
	}

	public RoomPoll getByRoom(Long roomId) {
		try {
			log.debug(" :: getPoll :: " + roomId);
			TypedQuery<RoomPoll> q = em.createNamedQuery("getPoll", RoomPoll.class);
			q.setParameter("roomId", roomId);
			return q.getSingleResult();
		} catch (NoResultException nre) {
			//expected
		} catch (Exception err) {
			log.error("[getPoll]", err);
		}
		return null;
	}

	public List<RoomPoll> get() {
		try {
			TypedQuery<RoomPoll> q = em.createNamedQuery("getPollListBackup", RoomPoll.class);
			return q.getResultList();
		} catch (NoResultException nre) {
			//expected
		} catch (Exception err) {
			log.error("[get]", err);
		}
		return null;
	}

	public List<RoomPoll> getArchived(Long roomId) {
		try {
			log.debug(" :: getArchived :: " + roomId);
			TypedQuery<RoomPoll> q = em.createNamedQuery("getArchivedPollList",RoomPoll.class);
			q.setParameter("roomId", roomId);
			return q.getResultList();
		} catch (NoResultException nre) {
			//expected
		} catch (Exception err) {
			log.error("[getArchived]", err);
		}
		return null;
	}

	public boolean hasPoll(Long roomId) {
		try {
			log.debug(" :: hasPoll :: " + roomId);
			TypedQuery<Long> q = em.createNamedQuery("hasPoll", Long.class);
			q.setParameter("roomId", roomId);
			q.setParameter("archived", false);
			return q.getSingleResult() > 0;
		} catch (NoResultException nre) {
			//expected
		} catch (Exception err) {
			log.error("[hasPoll]", err);
		}
		return false;
	}

	public boolean hasVoted(Long roomId, Long userId) {
		try {
			log.debug(" :: hasVoted :: " + roomId + ", " + userId);
			TypedQuery<RoomPollAnswer> q = em.createNamedQuery("hasVoted", RoomPollAnswer.class);
			q.setParameter("roomId", roomId);
			q.setParameter("userId", userId);
			q.getSingleResult();
			return true;
		} catch (NoResultException nre) {
			//expected
		} catch (Exception err) {
			log.error("[hasVoted]", err);
		}
		return false;
	}
}
