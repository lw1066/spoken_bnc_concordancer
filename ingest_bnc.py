
import os
import re
import sqlite3
import xml.etree.ElementTree as ET


CORPUS_DIR = "corpus_files"
DB_PATH = "bnc_corpus.db"

BATCH_SIZE = 1000


# ============================================================
# TEXT HELPERS
# ============================================================

def normalize_whitespace(text):
    return re.sub(r"\s+", " ", text).strip()


def render_node(element):
    """
    Convert an XML element into searchable/display text.

    Special BNC annotation elements are converted into readable
    markers, while <w> elements contribute their text.
    """

    search_parts = []
    display_parts = []

    if element.text:
        search_parts.append(element.text)
        display_parts.append(element.text)

    for child in element:

        tag = child.tag

        child_search, child_display = render_node(child)

        if tag == "pause":

            dur = child.attrib.get("dur", "")

            marker = (
                f"[pause: {dur}]"
                if dur
                else "[pause]"
            )

            search_parts.append(f" {marker} ")
            display_parts.append(f" {marker} ")

        elif tag == "vocal":

            desc = child.attrib.get("desc", "")

            marker = (
                f"[vocal: {desc}]"
                if desc
                else "[vocal]"
            )

            search_parts.append(f" {marker} ")
            display_parts.append(f" {marker} ")

        elif tag == "event":

            desc = child.attrib.get("desc", "")

            marker = (
                f"[event: {desc}]"
                if desc
                else "[event]"
            )

            search_parts.append(f" {marker} ")
            display_parts.append(f" {marker} ")

        elif tag == "shift":

            new_value = child.attrib.get("new", "")

            marker = (
                f"[shift: {new_value}]"
                if new_value
                else "[shift]"
            )

            search_parts.append(f" {marker} ")
            display_parts.append(f" {marker} ")

        elif tag == "anon":

            anon_type = child.attrib.get("type", "")
            name_type = child.attrib.get("nameType", "")

            values = ", ".join(
                value
                for value in [anon_type, name_type]
                if value
            )

            marker = (
                f"[anon: {values}]"
                if values
                else "[anon]"
            )

            search_parts.append(f" {marker} ")
            display_parts.append(f" {marker} ")

        else:

            search_parts.append(child_search)
            display_parts.append(child_display)

        if child.tail:

            search_parts.append(child.tail)
            display_parts.append(child.tail)

    return (
        normalize_whitespace("".join(search_parts)),
        normalize_whitespace("".join(display_parts)),
    )


# ============================================================
# WORD EXTRACTION
# ============================================================

def extract_words(utterance):
    """
    Extract every <w> token from an utterance.

    Each word gets:

        position
        word
        lemma
        pos
        class
        usas
    """

    words = []

    position = 0

    for element in utterance.iter("w"):

        word = "".join(element.itertext()).strip()

        if not word:
            continue

        words.append(
            (
                position,
                word,
                element.attrib.get("lemma"),
                element.attrib.get("pos"),
                element.attrib.get("class"),
                element.attrib.get("usas"),
            )
        )

        position += 1

    return words


# ============================================================
# DATABASE CREATION
# ============================================================

def create_tables(conn):

    cursor = conn.cursor()

    cursor.executescript(
        """

        DROP TABLE IF EXISTS utterances_fts;

        DROP TABLE IF EXISTS words;

        DROP TABLE IF EXISTS utterances;

        DROP TABLE IF EXISTS texts;


        --------------------------------------------------------
        -- RECORDINGS / TEXTS
        --------------------------------------------------------

        CREATE TABLE texts (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            corpus_id TEXT NOT NULL UNIQUE,

            filename TEXT NOT NULL,

            genre TEXT

        );


        --------------------------------------------------------
        -- UTTERANCES
        --------------------------------------------------------

        CREATE TABLE utterances (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            text_id INTEGER NOT NULL,

            utterance_number TEXT,

            speaker TEXT,

            trans TEXT,

            who_confidence TEXT,

            search_body TEXT NOT NULL,

            display_body TEXT NOT NULL,

            FOREIGN KEY (text_id)
                REFERENCES texts(id)

        );


        --------------------------------------------------------
        -- WORDS
        --------------------------------------------------------

        CREATE TABLE words (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            utterance_id INTEGER NOT NULL,

            position INTEGER NOT NULL,

            word TEXT NOT NULL,

            lemma TEXT,

            pos TEXT,

            class TEXT,

            usas TEXT,

            FOREIGN KEY (utterance_id)
                REFERENCES utterances(id)

        );


        --------------------------------------------------------
        -- FULL TEXT SEARCH
        --------------------------------------------------------

        CREATE VIRTUAL TABLE utterances_fts

        USING fts5(

            search_body,

            content='utterances',

            content_rowid='id'

        );


        --------------------------------------------------------
        -- INDEXES
        --------------------------------------------------------

        CREATE INDEX idx_texts_corpus_id
        ON texts(corpus_id);


        CREATE INDEX idx_texts_filename
        ON texts(filename);


        CREATE INDEX idx_words_word
        ON words(word);


        CREATE INDEX idx_words_word_lower
        ON words(LOWER(word));


        CREATE INDEX idx_words_lemma
        ON words(lemma);


        CREATE INDEX idx_words_lemma_lower
        ON words(LOWER(lemma));


        CREATE INDEX idx_words_pos
        ON words(pos);


        CREATE INDEX idx_words_class
        ON words(class);


        CREATE INDEX idx_words_usas
        ON words(usas);


        CREATE INDEX idx_words_lemma_pos
        ON words(lemma, pos);


        CREATE INDEX idx_words_utterance_position
        ON words(utterance_id, position);

        """
    )

    conn.commit()


# ============================================================
# PROCESS ONE XML FILE
# ============================================================

def process_file(conn, filename, text_id):

    path = os.path.join(
        CORPUS_DIR,
        filename
    )

    print(
        f"Processing {filename}"
    )

    cursor = conn.cursor()

    word_rows = []

    utterance_count = 0

    word_count = 0


    for event, element in ET.iterparse(
        path,
        events=("end",)
    ):

        if element.tag != "u":
            continue


        # ----------------------------------------------------
        # UTTERANCE METADATA
        # ----------------------------------------------------

        utterance_number = element.attrib.get("n")

        speaker = element.attrib.get("who")

        trans = element.attrib.get("trans")

        who_confidence = element.attrib.get(
            "whoConfidence"
        )


        # ----------------------------------------------------
        # TEXT
        # ----------------------------------------------------

        search_body, display_body = render_node(
            element
        )


        # ----------------------------------------------------
        # INSERT UTTERANCE
        # ----------------------------------------------------

        cursor.execute(
            """

            INSERT INTO utterances (

                text_id,
                utterance_number,
                speaker,
                trans,
                who_confidence,
                search_body,
                display_body

            )

            VALUES (?, ?, ?, ?, ?, ?, ?)

            """,

            (

                text_id,
                utterance_number,
                speaker,
                trans,
                who_confidence,
                search_body,
                display_body,

            )

        )


        utterance_id = cursor.lastrowid


        # ----------------------------------------------------
        # EXTRACT WORDS
        # ----------------------------------------------------

        for (

            position,
            word,
            lemma,
            pos,
            word_class,
            usas,

        ) in extract_words(element):

            word_rows.append(

                (

                    utterance_id,
                    position,
                    word,
                    lemma,
                    pos,
                    word_class,
                    usas,

                )

            )

            word_count += 1


        utterance_count += 1


        # ----------------------------------------------------
        # INSERT WORDS IN BATCHES
        # ----------------------------------------------------

        if len(word_rows) >= BATCH_SIZE:

            cursor.executemany(

                """

                INSERT INTO words (

                    utterance_id,
                    position,
                    word,
                    lemma,
                    pos,
                    class,
                    usas

                )

                VALUES (?, ?, ?, ?, ?, ?, ?)

                """,

                word_rows

            )

            word_rows.clear()


        # ----------------------------------------------------
        # COMMIT EVERY 1000 UTTERANCES
        # ----------------------------------------------------

        if utterance_count % BATCH_SIZE == 0:

            conn.commit()


        # ----------------------------------------------------
        # RELEASE XML MEMORY
        # ----------------------------------------------------

        element.clear()


    # --------------------------------------------------------
    # INSERT REMAINING WORDS
    # --------------------------------------------------------

    if word_rows:

        cursor.executemany(

            """

            INSERT INTO words (

                utterance_id,
                position,
                word,
                lemma,
                pos,
                class,
                usas

            )

            VALUES (?, ?, ?, ?, ?, ?, ?)

            """,

            word_rows

        )


    conn.commit()


    return (
        utterance_count,
        word_count
    )


# ============================================================
# MAIN IMPORT
# ============================================================

def parse_and_index():

    if not os.path.isdir(CORPUS_DIR):

        raise FileNotFoundError(
            f"Corpus directory not found: {CORPUS_DIR}"
        )


    # --------------------------------------------------------
    # DELETE OLD DATABASE
    # --------------------------------------------------------

    if os.path.exists(DB_PATH):

        print(
            f"Removing existing database: {DB_PATH}"
        )

        os.remove(DB_PATH)


    # --------------------------------------------------------
    # CONNECT
    # --------------------------------------------------------

    conn = sqlite3.connect(
        DB_PATH
    )


    # --------------------------------------------------------
    # SQLITE PERFORMANCE SETTINGS
    # --------------------------------------------------------

    conn.execute(
        "PRAGMA journal_mode=WAL;"
    )

    conn.execute(
        "PRAGMA synchronous=NORMAL;"
    )

    conn.execute(
        "PRAGMA temp_store=MEMORY;"
    )

    conn.execute(
        "PRAGMA cache_size=-200000;"
    )


    # --------------------------------------------------------
    # CREATE DATABASE
    # --------------------------------------------------------

    create_tables(conn)


    # --------------------------------------------------------
    # FIND TAGGED XML FILES ONLY
    # --------------------------------------------------------

    files = sorted(

        filename

        for filename in os.listdir(
            CORPUS_DIR
        )

        if filename.endswith("-tgd.xml")

    )


    print()

    print(
        f"Found {len(files)} tagged XML files"
    )

    print()


    cursor = conn.cursor()

    processed = 0

    total_utterances = 0

    total_words = 0


    # ========================================================
    # PROCESS FILES
    # ========================================================

    for filename in files:

        try:

            path = os.path.join(
                CORPUS_DIR,
                filename
            )


            # ------------------------------------------------
            # GET CORPUS TEXT ID
            # ------------------------------------------------

            corpus_id = None


            for event, element in ET.iterparse(
                path,
                events=("start",)
            ):

                if element.tag == "text":

                    corpus_id = element.attrib.get(
                        "id"
                    )

                    break


            if corpus_id is None:

                print(
                    f"WARNING: no <text> ID in {filename}"
                )

                continue


            # ------------------------------------------------
            # START TRANSACTION FOR THIS FILE
            # ------------------------------------------------

            conn.execute(
                "BEGIN"
            )


            # ------------------------------------------------
            # INSERT TEXT RECORD
            # ------------------------------------------------

            cursor.execute(

                """

                INSERT INTO texts (

                    corpus_id,
                    filename,
                    genre

                )

                VALUES (?, ?, ?)

                """,

                (

                    corpus_id,
                    filename,
                    None,

                )

            )


            text_id = cursor.lastrowid


            # ------------------------------------------------
            # PROCESS UTTERANCES + WORDS
            # ------------------------------------------------

            utterance_count, word_count = process_file(

                conn,

                filename,

                text_id

            )


            total_utterances += utterance_count

            total_words += word_count

            processed += 1


            print(

                f"Completed {processed}/{len(files)}: "

                f"{filename} "

                f"({utterance_count:,} utterances, "

                f"{word_count:,} words)"

            )


        except Exception as error:

            print()

            print(
                f"ERROR processing {filename}"
            )

            print(
                error
            )

            print(
                "Rolling back this file..."
            )

            print()

            conn.rollback()

            continue


        # ----------------------------------------------------
        # PERIODIC COMMIT
        # ----------------------------------------------------

        if processed % 10 == 0:

            conn.commit()


    # ========================================================
    # BUILD FTS INDEX
    # ========================================================

    print()

    print(
        "Building utterance FTS index..."
    )

    print()


    conn.execute(

        """

        INSERT INTO utterances_fts (

            rowid,
            search_body

        )

        SELECT

            id,
            search_body

        FROM utterances;

        """

    )


    conn.commit()


    # ========================================================
    # FINAL COUNTS
    # ========================================================

    texts_count = conn.execute(

        "SELECT COUNT(*) FROM texts"

    ).fetchone()[0]


    utterances_count = conn.execute(

        "SELECT COUNT(*) FROM utterances"

    ).fetchone()[0]


    words_count = conn.execute(

        "SELECT COUNT(*) FROM words"

    ).fetchone()[0]


    print()

    print(
        "======================================"
    )

    print(
        "IMPORT COMPLETE"
    )

    print(
        "======================================"
    )

    print(
        f"Texts:       {texts_count:,}"
    )

    print(
        f"Utterances:  {utterances_count:,}"
    )

    print(
        f"Words:       {words_count:,}"
    )

    print(
        "======================================"
    )

    print()


    conn.close()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    parse_and_index()

