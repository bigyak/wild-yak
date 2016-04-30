/* @flow */
import mongo from "../db";

export async function get(id, username, type) {
  const db = await mongo.get();
  const coll = await db.getCollection("poems");
  return await coll.findOne({ id, username, type });
}

export async function getPoemsByUser(username, type) {
  const db = await mongo.get();
  const coll = await db.getCollection("poems");
  return await coll.find({ username, type });
}

export async function save(poem) {
  const db = await mongo.get();
  const coll = await db.getCollection("poems");
  return await coll.insertOne(poem);
}

export async function getFirstLine(poem: object, maxChars: number) {

}
