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

import org.eclipse.jetty.websocket.api.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.google.gson.JsonObject;

/**
 *
 * @author Ivan Gracia (izanmail@gmail.com)
 * @since 4.3.1
 */
public class UserSession implements Closeable {

  private static final Logger log = LoggerFactory.getLogger(UserSession.class);

  //视频录制的保存路径
  public static String recorderDir = null;

  private final String name;
  private final Session session;
  private final String id;

  private final String roomName;

  private boolean closed = false;

  public UserSession(final String name, final String roomName, final Session session, String sessionId) {
    this.name = name;
    this.session = session;
    this.id = sessionId;
    this.roomName = roomName;
  }

  public String getName() {
    return name;
  }

  public String getUID() {
    return name;
  }

  public Session getSession() {
    return session;
  }

  public String getId() {
    return id;
  }
  public boolean getClosed() {return closed;}
  /**
   * The room to which the user is currently attending.
   *
   * @return The room
   */
  public String getRoomName() {
    return this.roomName;
  }


  public long getRoomID() {
    return 0;
  }

  @Override
  public void close() throws IOException {
    log.debug("PARTICIPANT {}: Releasing resources", this.name);
    closed = true;
  }

  public void sendMessage(JsonObject message) throws IOException {
    log.debug("USER {}: Sending message {}", name, message);
    synchronized (session) {
      session.getRemote().sendString(message.toString());
    }
  }

  public void sendMessage(String message) throws IOException {
    log.debug("USER {}: Sending message {}", name, message);
    synchronized (session) {
      session.getRemote().sendString(message);
    }
  }


  /*
   * (non-Javadoc)
   *
   * @see java.lang.Object#equals(java.lang.Object)
   */
  @Override
  public boolean equals(Object obj) {

    if (this == obj) {
      return true;
    }
    if (obj == null || !(obj instanceof UserSession)) {
      return false;
    }
    UserSession other = (UserSession) obj;
    boolean eq = name.equals(other.name);
    eq &= roomName.equals(other.roomName);
    return eq;
  }

  /*
   * (non-Javadoc)
   *
   * @see java.lang.Object#hashCode()
   */
  @Override
  public int hashCode() {
    int result = 1;
    result = 31 * result + name.hashCode();
    result = 31 * result + roomName.hashCode();
    return result;
  }
}
