FROM jboss/keycloak:latest

USER jboss

RUN sed -i -e 's/<web-context>auth<\/web-context>/<web-context>aim\/auth<\/web-context>/' $JBOSS_HOME/standalone/configuration/standalone.xml

