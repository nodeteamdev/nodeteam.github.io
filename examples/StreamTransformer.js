const { Transform, Readable } = require('stream');

class StreamTransformer {
    /**
     * Creates a transform stream with custom transformation logic
     * @param {Object} options - Configuration options
     * @param {Function} options.transform - Transformation function
     * @param {Function} [options.flush] - Optional flush method
     * @param {boolean} [options.objectMode=true] - Enable object mode
     */
    constructor(options = {}) {
        const {
            transform,
            flush = null,
            objectMode = true
        } = options;

        if (typeof transform !== 'function') {
            throw new Error('Transform function is required');
        }

        return new Transform({
            objectMode,

            // Transformation logic
            async transform(chunk, encoding, callback) {
                try {
                    // Allow async transformations
                    const result = await transform(chunk, this);

                    // Push transformed data or multiple chunks
                    if (Array.isArray(result)) {
                        result.forEach(item => this.push(item));
                    } else if (result !== null && result !== undefined) {
                        this.push(result);
                    }

                    callback(null);
                } catch (error) {
                    callback(error);
                }
            },

            // Optional flush method for end-of-stream processing
            async flush(callback) {
                try {
                    if (flush) {
                        const result = await flush(this);
                        if (result) {
                            this.push(result);
                        }
                    }
                    callback(null);
                } catch (error) {
                    callback(error);
                }
            }
        });
    }

    /**
     * Create a pipeline of transformers
     * @param {...StreamTransformer} transformers - Transformer streams
     * @returns {Object} Pipeline interface
     */
    static pipeline(...transformers) {
        return {
            /**
             * Pipe transformers to an input stream
             * @param {Readable} inputStream - Source stream
             * @returns {Readable} Transformed stream
             */
            through: (inputStream) => {
                return transformers.reduce(
                    (stream, transformer) => stream.pipe(transformer),
                    inputStream
                );
            }
        };
    }
}

// Practical Example Demonstrating StreamTransformer
async function demonstrateStreamTransformer() {
    // Example 1: Simple Data Transformation
    const numberTransformer = new StreamTransformer({
        transform: (chunk) => chunk * 2
    });

    const sourceStream = new Readable({
        objectMode: true,
        read() {
            this.push(1);
            this.push(2);
            this.push(3);
            this.push(null); // End of stream
        }
    });

    sourceStream
        .pipe(numberTransformer)
        .on('data', (chunk) => {
            console.log('Doubled number:', chunk);
        })
        .on('end', () => console.log('Number transformation complete'));

    // Example 2: Complex Data Transformation
    const userDataTransformer = new StreamTransformer({
        transform: async (user) => {
            // Simulate async operation (e.g., data enrichment)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Transform and filter users
            if (user.age >= 18) {
                return {
                    ...user,
                    category: user.age < 30 ? 'Young Adult' : 'Adult'
                };
            }

            // Return null to filter out underage users
            return null;
        },

        // Optional flush method for final processing
        flush: () => {
            console.log('Finished processing user stream');
        }
    });

    const usersStream = new Readable({
        objectMode: true,
        read() {
            this.push({ name: 'Alice', age: 25 });
            this.push({ name: 'Bob', age: 17 });
            this.push({ name: 'Charlie', age: 40 });
            this.push(null);
        }
    });

    usersStream
        .pipe(userDataTransformer)
        .on('data', (user) => {
            console.log('Processed User:', user);
        })
        .on('end', () => console.log('User transformation complete'));

    // Example 3: Pipeline Composition
    const uppercaseTransformer = new StreamTransformer({
        transform: (chunk) => chunk.toUpperCase(),
        objectMode: true
    });

    const filterTransformer = new StreamTransformer({
        transform: (chunk) => chunk.length > 3 ? chunk : null,
        objectMode: true
    });

    const wordsStream = new Readable({
        objectMode: true,
        read() {
            this.push('hello');
            this.push('hi');
            this.push('world');
            this.push('a');
            this.push(null);
        }
    });

    // Create a pipeline with multiple transformers
    const pipeline = StreamTransformer.pipeline(
        filterTransformer,
        uppercaseTransformer
    );

    pipeline
        .through(wordsStream)
        .on('data', (word) => {
            console.log('Processed Word:', word);
        })
        .on('end', () => console.log('Pipeline transformation complete'));
}

// Run the demonstration
demonstrateStreamTransformer().catch(console.error);

module.exports = StreamTransformer;
