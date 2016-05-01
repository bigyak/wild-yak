/* @flow */
import mongo from "../db";

export async function get(username) {
  const db = await mongo.get();
  const coll = await db.getCollection("users");
  return await coll.findOne({ username });
}

export async function addFollower(user, follower) {
  const db = await mongo.get();
  const coll = await db.getCollection("users");
  //..
}

export async function addFollowing(user, following) {
  const db = await mongo.get();
  const coll = await db.getCollection("users");
  //..
}

export async function deactivate(username) {

}

export async function delete(username) {

}
