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
package org.apache.openmeetings.core.util;

import static org.apache.openmeetings.util.OpenmeetingsVariables.webAppRootKey;

import java.util.Map;

import org.apache.directory.api.util.Strings;
import org.apache.openmeetings.db.dao.label.LabelDao;
import org.apache.openmeetings.db.entity.user.User;
import org.apache.wicket.util.collections.MicroMap;
import org.apache.wicket.validation.IValidatable;
import org.apache.wicket.validation.IValidator;
import org.apache.wicket.validation.ValidationError;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;

public class StrongPasswordValidator implements IValidator<String> {
	private static final long serialVersionUID = 1L;
	private static final Logger log = Red5LoggerFactory.getLogger(StrongPasswordValidator.class, webAppRootKey);
	private final int minLength;
	private final boolean web;
	private User u;

	public StrongPasswordValidator(final int minLength, final User u) {
		this(true, minLength, u);
	}

	public StrongPasswordValidator(final boolean web, final int minLength, final User u) {
		this.minLength = minLength;
		this.web = web;
		this.u = u;
	}

	private static boolean noDigit(String password) {
		return password == null || !password.matches(".*\\d+.*");
	}

	private static boolean noSymbol(String password) {
		return password == null || !password.matches(".*[!@#$%^&*\\]\\[]+.*");
	}

	private static boolean noUpperCase(String password) {
		return password == null || password.equals(password.toLowerCase());
	}

	private static boolean noLowerCase(String password) {
		return password == null || password.equals(password.toUpperCase());
	}

	private boolean badLength(String password) {
		return password == null || password.length() < minLength;
	}

	private static boolean checkWord(String password, String word) {
		if (Strings.isEmpty(word) || word.length() < 3) {
			return false;
		}
		for (int i = 0; i < word.length() - 3; ++i) {
			String substr = word.toLowerCase().substring(i, i + 3);
			if (password.toLowerCase().indexOf(substr) > -1) {
				return true;
			}
		}
		return false;
	}

	private boolean hasStopWords(String password) {
		if (checkWord(password, u.getLogin())) {
			return true;
		}
		if (u.getAddress() != null) {
			String email = u.getAddress().getEmail();
			if (!Strings.isEmpty(email)) {
				for (String part : email.split("[.@]")) {
					if (checkWord(password, part)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	private void error(IValidatable<String> pass, String key) {
		error(pass, key, null);
	}

	private void error(IValidatable<String> pass, String key, Map<String, Object> params) {
		if (web) {
			ValidationError err = new ValidationError().addKey(key);
			if (params != null) {
				err.setVariables(params);
			}
			pass.error(err);
		} else {
			String msg = LabelDao.getString(key, 1L);
			if (params != null && !params.isEmpty() && !Strings.isEmpty(msg)) {
				for (Map.Entry<String, Object> e : params.entrySet()) {
					msg = msg.replace(String.format("${%s}", e.getKey()), "" + e.getValue());
				}
			}
			log.warn(msg);
			pass.error(new ValidationError(msg));
		}
	}

	@Override
	public void validate(IValidatable<String> pass) {
		if (badLength(pass.getValue())) {
			error(pass, "bad.password.short", new MicroMap<String, Object>("0", minLength));
		}
		if (noLowerCase(pass.getValue())) {
			error(pass, "bad.password.lower");
		}
		if (noUpperCase(pass.getValue())) {
			error(pass, "bad.password.upper");
		}
		if (noDigit(pass.getValue())) {
			error(pass, "bad.password.digit");
		}
		if (noSymbol(pass.getValue())) {
			error(pass, "bad.password.special");
		}
		if (hasStopWords(pass.getValue())) {
			error(pass, "bad.password.stop");
		}
	}

	public void setUser(User u) {
		this.u = u;
	}
}
