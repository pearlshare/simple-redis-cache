require("should");
const Bluebird = require("bluebird");
const RedisStore = require("../lib/redis_store");

describe("redisStore", () => {

  const name = "testStore";
  const redisOptions = Object.assign({
    host: process.env.REDIS_HOST || "127.0.0.1"
  });

  const store = new RedisStore(name, redisOptions);

  describe("getName", () => {
    it("should return with given name", () => {
      store.getName().should.be.equal(name);
    });
  });

  describe("get", () => {
    it("should retrieve an existing key", () => {

      const key = "chuck-norris";
      const value = "superman";

      return store.set(key, value)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.get(key))
        .should.eventually.be.equal(value);
    });

    it("should return null if key doesn't exist", () => {

      return store.get("unknownKey")
        .should.eventually.be.null;
    });
  });

  describe("set", () => {
    it("should store a value", () => {

      const key = "key";
      const value = "neverExpire";

      return store.set(key, value)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.get(key))
        .should.eventually.be.equal(value);
    });

    it("should store with an expiry if ttl set", () => {

      const key = "shortLivedKey";
      const value = "expireIn1s";
      const ttlInSeconds = 1;

      store.set(key, value, ttlInSeconds)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.get(key))
        .should.eventually.be.equal(value);

      return Bluebird.delay(ttlInSeconds * 1000)
        .done(() => store.get(key)
            .should.eventually.be.null
        );
    });
  });

  describe("del", () => {
    it("should delete an existing key", () => {

      const key = "key";
      const value = "neverExpire";

      return store.set(key, value)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.del(key))
        .then(v => {
          v.should.be.ok();
        })
        .then(() => store.get(key))
        .should.eventually.be.null;
    });

    it("should return null deleting non-existing key", () => {
      return store.del("unknownKey")
        .should.eventually.be.null;
    });
  });

  describe("expire", () => {
    it("should set a key with expire in seconds", () => {

      const key = "key";
      const value = "make it expire";
      const ttlInSeconds = 1;

      store.set(key, value)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.expire(key, ttlInSeconds))
        .should.eventually.be.ok();

      return Bluebird.delay(ttlInSeconds * 1000)
        .done(() => store.get(key)
            .should.eventually.be.null);
    });

    it("should return null expiring non-existing key", () => {
      return store.expire("unknownKey", 10)
        .should.eventually.be.null;
    });
  });

  describe("ttl", () => {

    before(() => store.deleteAll());

    it("should return ttl left for a key in seconds", () => {

      const key = "key";
      const value = "make it expire";
      const ttlInSeconds = 10;

      return store.set(key, value, ttlInSeconds)
        .then(test => {
          test.should.be.ok();
        })
        .then(() => store.ttlInSeconds(key))
        // it should be same as the time elapsed is very vvery small
        .should.eventually.be.equal(ttlInSeconds);
    });

    it("should return null on ttl for a non-existing key", () => {
      return store.ttlInSeconds("unknownKey")
        .should.eventually.be.null;
    });
  });

  describe("keys", () => {

    const keyValues = {key1: "value1", key2: "value2"};

    before(() => store.deleteAll());

    beforeEach(() => Promise.all(Object.keys(keyValues)
        .map(key => store.set(key, keyValues[key]))));

    it("should return all the keys", () => {

      return store.keys()
        .then(keys => keys.map(k => Object.keys(keyValues).should.containEql(k)));
    });

    it("should return all the keys matches pattern", () => {

      return store.keys("key[2]")
        .should.eventually.containEql("key2");
    });
  });

  describe("deleteAll", () => {

    const keyValues = {key1: "value1", key2: "value2"};

    beforeEach(() => Promise.all(Object.keys(keyValues)
        .map(key => store.set(key, keyValues[key]))));

    it("should delete all the keys", () => {

      return store.deleteAll()
        .then(v => v.should.be.ok())
        .then(() => store.keys())
        .should.eventually.be.empty();
    });

    it("should delete all the keys matches pattern", () => {

      return store.deleteAll("key[2]")
        .then(v => {
          v.should.be.ok();
        })
        .then(() => store.keys())
        .should.eventually.be.not.empty()
        .and.not.containEql("key2");
    });

    it("should not delete when nothing matches", () => {

      return store.deleteAll()
        .then(v => {
          v.should.be.ok();
        })
        .then(() => store.deleteAll("nonExistingKey"))
        .should.eventually.be.ok();
    });
  });
});