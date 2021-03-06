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

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Ivan Gracia (izanmail@gmail.com)
 * @since 4.3.1
 */
public class RoomManager {

  private final Logger log = LoggerFactory.getLogger(RoomManager.class);

  private volatile AtomicLong roomId = new AtomicLong(0);

  private final ConcurrentMap<String, Long> roomIDMap = new ConcurrentHashMap<>();

  private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();

  /**
   * Looks for a room in the active room list.
   *
   * @param roomName
   *          the name of the room
   * @return the room if it was already created, or a new one if it is the first time this room is
   *         accessed
   */
  public synchronized Room getRoom(String roomName) {
    log.debug("Searching for room {}", roomName);
    Room room = rooms.get(roomName);
    if (room == null) {
      log.debug("Room {} not existent. Will create now!", roomName);
      long newRoomId;
      if (roomIDMap.containsKey(roomName)) {
        newRoomId = roomIDMap.get(roomName);
      } else {
        newRoomId = roomId.getAndIncrement();
        roomIDMap.put(roomName, newRoomId);
      }
      room = new Room(roomName, newRoomId);
      rooms.put(roomName, room);
    }
    log.debug("Room {} found!", roomName);
    return room;
  }

  public Room getRoom(long roomId) {
    String roomName = "" + roomId;
    return getRoom(roomName);
  }


  /**
   * Removes a room from the list of available rooms.
   *
   * @param room
   *          the room to be removed
   */
  public void removeRoom(Room room) {
    this.rooms.remove(room.getName());
    room.close();
    log.info("Room {} removed and closed", room.getName());
  }

}
