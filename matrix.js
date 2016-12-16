/*
 * An object to represent a matrix with real entries
 */
function Matrix(entries) {
    this.entries = entries;
    this.rows = this.entries.length;
    this.cols = this.entries[0].length;

    for (var i=1; i<this.rows; i++) {
        if (this.entries[i].length !== this.cols) {
            throw "Invalid entries";
        }
    }

    /*
     * Copmute and return this * a
     */
    this.multiply = function(a) {
        if (this.cols !== a.rows) {
            throw "Incompatible sizes";
        }

        var new_entries = [];

        for (var i=0; i<this.rows; i++) {
            new_entries.push([]);
            for (var j=0; j<a.cols; j++) {
                new_entries[i].push(0);
                for (var k=0; k<this.cols; k++) {
                    new_entries[i][j] += this.entries[i][k] * a.entries[k][j];
                }
            }
        }

        return new Matrix(new_entries);
    }

    /*
     * Return this + a
     */
    this.add = function(a) {
        if (this.cols !== a.cols || this.rows !== a.rows) {
            throw "Incompatible sizes";
        }

        var new_entries = [];

        for (var i=0; i<this.rows; i++) {
            new_entries.push([]);
            for (var j=0; j<a.cols; j++) {
                new_entries[i].push(this.entries[i][j] + a.entries[i][j])
            }
        }

        return new Matrix(new_entries);
    }

    /*
     * Scale this matrix by a number
     */
    this.scale = function(k) {
        var new_entries = [];

        for (var i=0; i<this.rows; i++) {
            new_entries.push([]);
            for (var j=0; j<this.cols; j++) {
                new_entries[i].push(k * this.entries[i][j]);
            }
        }

        return new Matrix(new_entries);
    }

    /*
     * Return this - a
     */
    this.subtract = function(a) {
        return this.add(a.scale(-1));
    }

    /*
     * Return the (i,j)-entry of this matrix (indexed at 0)
     */
    this.entry = function(i, j) {
        return this.entries[i][j]
    }

    /*
     * Return the Euclidean norm for a column vector (i.e. matrix with one
     * column)
     */
    this.norm = function() {
        if (this.cols !== 1) {
            throw "Incompatible size";
        }

        var squares = 0;
        for (var i=0; i<this.rows; i++) {
            squares += Math.pow(this.entries[i][0], 2);
        }

        return Math.sqrt(squares);
    }

    /*
     * Return the determinant of a 2x2 matrix
     */
    this.determinant = function() {
        if (this.cols !== 2 || this.rows !== 2) {
            throw "Incompatible size";
        }

        return (this.entries[0][0] * this.entries[1][1] -
                this.entries[0][1] * this.entries[1][0]);
    }

    /*
     * Return the inverse of a 2x2 matrix
     */
    this.inverse = function() {
        if (this.cols !== 2 || this.rows !== 2) {
            throw "Incompatible size";
        }

        var det = this.determinant();
        if (this.det === 0) {
            throw "Matrix is not invertible";
        }

        var new_entries = [
            [this.entries[1][1], -this.entries[0][1]],
            [-this.entries[1][0], this.entries[0][0]]
        ];

        return new Matrix(new_entries).scale(1 / det);
    }

    /*
     * Return a string representation of this matrix
     */
    this.toString = function() {
        var o = "";
        for (var i=0; i<this.rows; i++) {
            for (var j=0; j<this.cols; j++) {
                o += this.entries[i][j] + " ";
            }

            if (i + 1 < this.rows) {
                o += "\n";
            }
        }
        return o;
    }
}

/*
 * Return a Matrix object representing the column vector <u, v>
 */
Matrix.prototype.vector = function(u, v) {
    return new Matrix([[u], [v]]);
}