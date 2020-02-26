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



import org.apache.openmeetings.core.converter.DocumentConverter;
import org.apache.openmeetings.core.converter.FlvExplorerConverter;
import org.apache.openmeetings.core.converter.ImageConverter;
import org.apache.openmeetings.core.data.file.FileProcessor;
import org.apache.openmeetings.db.dao.file.FileItemDao;
import org.apache.openmeetings.util.OmFileHelper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.web.socket.client.standard.WebSocketContainerFactoryBean;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import javax.websocket.ContainerProvider;
import java.io.File;
import java.util.Arrays;


/**
 *
 * @author Ivan Gracia (izanmail@gmail.com)
 * @since 4.3.1
 */
@SpringBootApplication
@EnableWebSocket
public class GroupCallApp implements WebSocketConfigurer, ApplicationRunner{

  private static final Logger log = LoggerFactory.getLogger(GroupCallApp.class);

    @Autowired
    private ApplicationContext appContext;

  @Bean
  public UserRegistry registry() {
    return new UserRegistry();
  }

  @Bean
  public RoomManager roomManager() {
    return new RoomManager();
  }

  @Bean
  public CallHandler groupCallHandler() {
    return new CallHandler();
  }


    @Bean
    public FileProcessor fileProcessor() {
        return new FileProcessor();
    }

    @Bean
    public FlvExplorerConverter flvExplorerConverter() {
        return new FlvExplorerConverter();
    }

    @Bean
    public FileItemDao fileItemDao() {
        return new FileItemDao();
    }

    @Bean
    public ImageConverter imageConverter() {
        return new ImageConverter();
    }

    @Bean
    public DocumentConverter documentConverter() {
        return new DocumentConverter();
    }



  public static void main(String[] args) throws Exception {
    SpringApplication app = new SpringApplication(GroupCallApp.class);
    app.setAddCommandLineProperties(false);
    app.run(args);
  }


  @Bean
  public ServletServerContainerFactoryBean createServletServerContainerFactoryBean() {
    ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();

    container.setMaxTextMessageBufferSize(64*1024);
    container.setMaxBinaryMessageBufferSize(64*1024);
    ContainerProvider.getWebSocketContainer().setDefaultMaxTextMessageBufferSize(64*1024);
    return container;
  }


  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(groupCallHandler(), "/groupcall").setAllowedOrigins("*");
  }

  @Override
  public void run(ApplicationArguments args) throws Exception {
    log.info("Application started with command-line arguments: {}", Arrays.toString(args.getSourceArgs()));
    boolean containsOption = args.containsOption("record.dir");
    if (containsOption) {
      log.info("arg record dir:" + args.getOptionValues("record.dir"));
      UserSession.recorderDir = args.getOptionValues("record.dir").get(0);
      log.info("record dir:" + UserSession.recorderDir);
    } else {
      log.info("record disabled");
    }

    if (args.containsOption("redis.host")) {
      String host = args.getOptionValues("redis.host").get(0);
      int port = 6379;
      if (args.containsOption("redis.port")) {
        port = Integer.parseInt(args.getOptionValues("redis.port").get(0));
      }

      String password = "";
      if (args.containsOption("redis.password")) {
        password = args.getOptionValues("redis.password").get(0);
      }

      int db = 0;
      if (args.containsOption("redis.db")) {
        db = Integer.parseInt(args.getOptionValues("redis.db").get(0));
      }
      CallHandler.redisHost = host;
      CallHandler.redisPort = port;
      CallHandler.redisPassword = password;
      CallHandler.redisDB = db;
    } else {
      CallHandler.redisHost = "127.0.0.1";
      CallHandler.redisPort = 6379;
      CallHandler.redisPassword = "";
      CallHandler.redisDB = 0;
    }

    if (args.containsOption("auth.pass")) {
      int pass = Integer.parseInt(args.getOptionValues("auth.pass").get(0));
      CallHandler.authPass = pass == 1;
    } else {
      CallHandler.authPass = true;
    }

    log.info("redis host:{} port:{} password:{} db:{}",
            CallHandler.redisHost, CallHandler.redisPort, CallHandler.redisPassword, CallHandler.redisDB);


  }

}
