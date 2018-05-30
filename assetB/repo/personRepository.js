'use strict';

const Person = require('../json/person');

class PersonRepository {
    constructor() {
        this.persons = new Map([
            [1, new Person(1, 'John', 'Doe', 'jd@example.com')],
            [2, new Person(2, 'Jane', 'Doe', 'jane@example.com')],
            [3, new Person(3, 'We', 'DoWork', 'WeDoWork@almende.org')],
            [4, new Person(4, 'Ludo', 'Stellingwerff', 'ludo@almende.org')],
            [5, new Person(5, 'Luis', 'Cunha', 'luis@almende.org')]
        ]);
    }

    getById(id) {
        return this.persons.get(id);
    }

    getAll() {
        return Array.from(this.persons.values());
    }

    remove() {
        const keys = Array.from(this.persons.keys());
        this.persons.delete(keys[keys.length - 1]);
    }

    save(person) {
        if (this.getById(person.id) !== undefined) {
            this.persons[person.id] = person;
            return 'Updated Person with id=' + person.id;
        }
        else {
            this.persons.set(person.id, person);
            return 'Added Person with id=' + person.id;
        }
    }
}

const personRepository = new PersonRepository();

module.exports = personRepository;