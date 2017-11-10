/**
 * Use in a supertest end function to successfully run asserts with Jest so that failures are recognised.
 */
module.exports = (err, res, done, asserts) => {
  try {
    expect(err).toBeNull()
    asserts()
    done()
  } catch (err) {
    done.fail(err)
  }
}
