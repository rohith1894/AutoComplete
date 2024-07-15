class Node {
    constructor() {
        this.isEnd = false;
        this.child = [];
        for (var i = 0; i < 26; i++) {
            this.child[i] = null;
        }
    }
}

class Trie {
    constructor() {
        this.root = new Node();
        this.list = [];
    }

    add(str) {
        let curr = this.root;
        for (var i = 0; i < str.length; i++) {
            var index = str.charCodeAt(i) - 97;
            if (index < 0) continue;
            if (curr.child[index] == null) curr.child[index] = new Node();
            curr = curr.child[index];
        }
        curr.isEnd = true;
    }

    helper(curr, postfix, prefix) {
        if (curr.isEnd == true)
            this.list.push(prefix + postfix);
        for (var i = 0; i < 26; i++)
            if (curr.child[i] != null) {
                postfix += 'abcdefghijklmnopqrstuvwxyz'.charAt(i);
                this.helper(curr.child[i], postfix, prefix);
                postfix = postfix.substring(0, postfix.length - 1);
            }
    }

    findPostFix(prefix) {
        this.list = [];
        let curr = this.root;
        for (var i = 0; i < prefix.length; i++) {
            var index = prefix.charCodeAt(i) - 97;
            if (curr.child[index] == null) return -1;
            curr = curr.child[index];
        }
        this.helper(curr, "", prefix);
        return curr;
    }
}

const head = new Trie();

function insertTrie(input) {
    for (var i = 0; i < 370104; i++)
        head.add(input[i]);
}

function searchEngine(word) {
    var result = head.findPostFix(word);
    return head.list;
}

document.addEventListener('DOMContentLoaded', function() {
    fetch('/AutoComplete/words.txt')
        .then(response => response.text())
        .then(data => {
            var input = data.split("\n");
            insertTrie(input);
        })
        .catch(error => console.error('Error fetching data:', error));

    document.querySelector('.input').addEventListener('keyup', function(event) {
        var input = event.target.value;
        if (input.length > 0) {
            input = input.toLowerCase();
            var arr = searchEngine(input);
            var words = "";
            for (var i = 0; i < arr.length; i++) {
                words += "<div class='words'>" + arr[i] + "</div>";
            }
            document.querySelector('.display-result').innerHTML = words;
        } else {
            document.querySelector('.display-result').innerHTML = '';
        }
    });
});


