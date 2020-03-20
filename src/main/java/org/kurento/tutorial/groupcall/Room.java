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

package org.kurento.tutorial.groupcall;


import java.io.Closeable;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import javax.annotation.PreDestroy;
import com.github.openjson.JSONObject;
import org.apache.openmeetings.util.NullStringer;
import org.eclipse.jetty.websocket.api.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;


/**
 * @author Ivan Gracia (izanmail@gmail.com)
 * @since 4.3.1
 */
public class Room implements Closeable {
      private final Logger log = LoggerFactory.getLogger(Room.class);

      private final ConcurrentMap<String, UserSession> participants = new ConcurrentHashMap<>();

      public final ConcurrentHashMap<Long, Deque<UndoObject>> undoList = new ConcurrentHashMap<>();

      private final String name;
      private final long id;

      public String getName() {
        return name;
      }

      public Room(String roomName, long roomId) {
        this.name = roomName;
        this.id = roomId;
        log.info("ROOM {} has been created", roomName);
      }


    public long getRoomID() {
      return id;
    }

    public synchronized void addUndo(Long wbId, UndoObject u) {
        if (wbId == null) {
            return;
        }

        if (!undoList.containsKey(wbId)) {
            undoList.put(wbId, new LimitedLinkedList<UndoObject>());
        }
        undoList.get(wbId).push(u);
    }

    public synchronized UndoObject getUndo(Long wbId) {
        if (!undoList.containsKey(wbId)) {
            return null;
        }
        Deque<UndoObject> deq = undoList.get(wbId);
        return deq.isEmpty() ? null : deq.pop();
    }


  @PreDestroy
  private void shutdown() {
    this.close();
  }

  public UserSession find(String userName) {
    return this.participants.get(userName);
  }

  public UserSession join(String userName, Session session, String sessionId) throws IOException {
    log.info("ROOM {}: adding participant {}", userName, userName);
    final UserSession participant = new UserSession(userName, this.name, session, sessionId);
    joinRoom(participant);
    participants.put(participant.getName(), participant);
    sendParticipantNames(participant);
    return participant;
  }

  public void leave(UserSession user) throws IOException {
    log.debug("PARTICIPANT {}: Leaving room {}", user.getName(), this.name);
    this.removeParticipant(user.getName());
    user.close();
  }

  private Collection<String> joinRoom(UserSession newParticipant) throws IOException {
    final JsonObject newParticipantMsg = new JsonObject();
    newParticipantMsg.addProperty("id", "newParticipantArrived");
    newParticipantMsg.addProperty("name", newParticipant.getName());

    final List<String> participantsList = new ArrayList<>(participants.values().size());
    log.debug("ROOM {}: notifying other participants of new participant {}", name,
        newParticipant.getName());

    for (final UserSession participant : participants.values()) {
      try {
        participant.sendMessage(newParticipantMsg);
      } catch (final IOException e) {
        log.debug("ROOM {}: participant {} could not be notified", name, participant.getName(), e);
      }
      participantsList.add(participant.getName());
    }

    return participantsList;
  }

  private void removeParticipant(String name) throws IOException {
      if (!participants.containsKey(name)) {
          return;
      }
    participants.remove(name);

    log.debug("ROOM {}: notifying all users that {} is leaving the room", this.name, name);

    final List<String> unnotifiedParticipants = new ArrayList<>();
    final JsonObject participantLeftJson = new JsonObject();
    participantLeftJson.addProperty("id", "participantLeft");
    participantLeftJson.addProperty("name", name);
    for (final UserSession participant : participants.values()) {
      try {
        participant.sendMessage(participantLeftJson);
      } catch (final IOException e) {
        unnotifiedParticipants.add(participant.getName());
      }
    }

    if (!unnotifiedParticipants.isEmpty()) {
      log.debug("ROOM {}: The users {} could not be notified that {} left the room", this.name,
          unnotifiedParticipants, name);
    }
  }



  public void sendParticipantNames(UserSession user) throws IOException {

    final JsonArray participantsArray = new JsonArray();
    for (final UserSession participant : this.getParticipants()) {
      if (!participant.equals(user)) {
        final JsonElement participantName = new JsonPrimitive(participant.getName());
        participantsArray.add(participantName);
      }
    }

    final JsonObject existingParticipantsMsg = new JsonObject();
    existingParticipantsMsg.addProperty("id", "existingParticipants");
    existingParticipantsMsg.add("data", participantsArray);
    log.debug("PARTICIPANT {}: sending a list of {} participants", user.getName(),
        participantsArray.size());
    user.sendMessage(existingParticipantsMsg);
  }


    public void sendWbOthers(UserSession user, WbAction a, JSONObject obj) {
        String func = String.format("WbArea.%s(%s);", a.name(), obj.toString(new NullStringer()));

        final JSONObject newParticipantMsg = new JSONObject();
        newParticipantMsg.put("id", "wb");
        if (obj.has("wbId")) {
            newParticipantMsg.put("wbId", obj.getString("wbId"));
        }
        newParticipantMsg.put("cmd", a.name());
        newParticipantMsg.put("params", obj);

        String s = newParticipantMsg.toString();

        for (final UserSession participant : participants.values()) {
            try {
                if (!user.getName().equals(participant.getName())) {
                    participant.sendMessage(s);
                }
            } catch (final IOException e) {
                log.debug("ROOM {}: participant {} could not be notified", name, participant.getName(), e);
            }
        }
    }

    public void sendWbAll(WbAction a, JSONObject obj) {
        String func = String.format("WbArea.%s(%s);", a.name(), obj.toString(new NullStringer()));

        final JSONObject newParticipantMsg = new JSONObject();
        newParticipantMsg.put("id", "wb");
        if(obj.has("wbId")) {
            newParticipantMsg.put("wbId", obj.getString("wbId"));
        }
        newParticipantMsg.put("cmd", a.name());
        newParticipantMsg.put("params", obj);

        String s = newParticipantMsg.toString(new NullStringer());

        for (final UserSession participant : participants.values()) {
            try {
                participant.sendMessage(s);
            } catch (final IOException e) {
                log.debug("ROOM {}: participant {} could not be notified", name, participant.getName(), e);
            }
        }
    }


  public Collection<UserSession> getParticipants() {
    return participants.values();
  }

  public UserSession getParticipant(String name) {
    return participants.get(name);
  }

  @Override
  public void close() {
    for (final UserSession user : participants.values()) {
      try {
        user.close();
      } catch (IOException e) {
        log.debug("ROOM {}: Could not invoke close on participant {}", this.name, user.getName(),
            e);
      }
    }

    participants.clear();
    log.debug("Room {} closed", this.name);
  }

    private static final int UNDO_SIZE = 20;
    private static class LimitedLinkedList<T> extends LinkedList<T> {
        private static final long serialVersionUID = 1L;

        @Override
        public void push(T e) {
            super.push(e);
            while (size() > UNDO_SIZE) {
                removeLast();
            }
        }
    }

}
