# Scuolabook unscrambler

A tiny script to make PDFs extracted from Scuolabook readable with other programs

## Usage

Requirement: Any recent version of Node.js &mdash; both the LTS and Current versions will work.

1. After activating your book, install the desktop Scuolabook app and download the book.
2. Copy the book's `.pdp` file somewhere and rename it to `.pdf`. If you're on Windows, you can find it in `C:\Users\[username]\.scuolabook\[your email]\books\[book directory]`. This should be similar in other OSs once you find the `.scuolabook` folder.
3. Open a terminal in the folder with the script and type `node . [path to the PDF file]`.

If everything went smoothly, in a matter of instants your PDF will have been unscrambled and you'll be able to open it using any application. Otherwise, feel free to [open an issue](https://github.com/DamianoMagrini/scuolabook-unscrambler/issues/new), and I'll try to look into it.

## Background and functioning

> This is mostly for myself when I'll come here in 10 years and have no idea what this code does.

TIM Scuolabook is a third-party platform that hosts eBooks for several Italian publishers. Users of the platform can read their books through the web app, the desktop apps, or the mobile apps. In an attempt to reduce digital piracy, like most other platforms, Scuolabook avoids providing books in plain PDF format. Specifically:

- the web app only serves images of the pages, with a few interactive overlays but no possibility to select/copy the text;
- the desktop application does, at least apparently, offer the full PDF experience, but when one goes to look for the PDF, what is found instead are "PDP" files, which look totally like regular PDFs but give a generic error when opened.

While another tool already exists to download the images from the web app and stitch them into a PDF, the result is unsatisfactory: too large and low-resolution, and no selectable text.

The "PDP" files are indeed just PDFs, but they are slightly scrambled up. PDF files, in general, are composed (among other things) of a series of "objects" which can reference one another (by their object number/id) and, after the objects, a "cross-reference table" (xref) with the indices (in bytes) of all the objects contained in the file in order of object number, to make random access faster. I.e., if the computer wants to read object 15, instead of going through the whole file until it finds object 15, it goes to the 15th line of the xref table to locate the object's position in the file, and then goes directly to read it.

Here's an example of a PDF object:

```
1 0 obj
(object contents)
endobj
```

Where 1 is the object number, 0 is the "generation number" (no, I don't know what that means, but it's almost always 0). Keep in mind that object numbers can also be padded with zeros, so we might get something like this:

```
0000000001 0 obj
(object contents)
endobj
```

It's the same, but it occupies a different number of bytes. And for example, in the xref table we might expect this one to be the first entry:

```
0000000025 00000 n
```

Which means that we find the first object (i.e., object 1) at byte 25 in the PDF (specifically, we find generation 0 of object 1 there). Note that every xref entry must be exactly 20 characters long, corresponding to:

- 10-digit byte index,
- 1 space,
- 5-digit generation number,
- 1 space,
- `n` (or `f` if the object is not used in the file, meaning "free"),
- 2-character end-of-line, the usual CRLF.

What Scuolabook does is it just XORs both the object numbers and byte indices with a specific "key", a number with 8 to 10 digits. So, if say the key is `272665865`, then

```
000001117 0 obj
(object contents)
endobj
```

will become

```
272664916 0 obj
(object contents)
endobj
```

and likewise,

```
0000306493 00000 n
```

will become

```
0272900148 00000 n
```

And since XOR is symmetric, once we identify the key, we can just re-apply it to the scrambled numbers to unscramble them.

How do we find the key? I was not able to find it written anywhere and it appears to be specific for each book, so I observed that, when an object is referenced by another object, its true number is used &mdash; if we manage to associate an object number with an object, we can find the key and unscramble the PDF.

There are two kinds of objects that are always present in a PDF file: a `/Pages` object referencing all the pages as its children (or `/Kids`), and many `/Page` objects referencing the `/Pages` object as their `/Parent`. For example, we might see something like this:

```
272664916 0 obj
<< /Type /Pages /Kids [ 1118 0 R 1119 0 R (...) ] /Count 94 >>
endobj

272664919 0 obj
<< /Type /Page  /MediaBox [0 0 594.95 809.71 ]  /Parent 1117 0 R /Group 5 0 R  (...)  >>
endobj
```

So we know that `1117 0 R` is a reference to the `/Pages` object: that is, the true number of the `/Pages` object is 1117. So we know that what happened is that `1117` was XORed with the key, and the result was `272664916`. But because, again, XOR is a symmetric operator, we can get out key by doing the opposite, `272664916 XOR 1117`, which in this case is equal to `272665865`. We can now use this key to unscramble the entire document, caring to keep the number of bytes unaltered:

```
000001117 0 obj
<< /Type /Pages /Kids [ 1118 0 R 1119 0 R (...) ] /Count 94 >>
endobj

000001118 0 obj
<< /Type /Page  /MediaBox [0 0 594.95 809.71 ]  /Parent 1117 0 R /Group 5 0 R  (...)  >>
endobj
```

So the tool, in order,

1. determines the key by comparing the scrambled number of the `/Pages` object with its true number as it is referenced by any `/Page`, and then
2. uses this key to unscramble all the object numbers (keeping them the same length) and byte indices in the xref table.

## Acknowledg(e)ments

This tool would have taken much more than a handful of hours to put together if it weren't for these wonderful resources by wonderful people:

- ["Introduction to PDF syntax" by Guillaume Endignoux](https://gendignoux.com/blog/2016/10/04/pdf-basics.html)
- ["Disappointing Rights Management" by Alberto Coscia (archived)](https://web.archive.org/web/20200202140307/https://albertocoscia.me/posts/drm/)
- ["PDF Reference. Third Edition" by Adobe Systems Incorporated](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.4.pdf) (I must say it's surprisingly human-readable for a formal spec)

## Legal stuff (sorry)

### Disclaimer

Disclaimer: Use of Scuolabook Unscrambler for Extracting PDFs from Scuolabook

The purpose of this disclaimer is to clarify the intentions behind Scuolabook Unscrambler ("the Tool") for extracting PDFs from specific textbook platforms. It is important to understand that this disclaimer is not intended to provide legal advice, but rather to inform users about the intended purpose of the Tool and to discourage any potential misuse that may violate copyright or intellectual property laws.

1. Legal Compliance. The Tool is designed solely for personal and educational purposes, enabling users to access their legally obtained textbooks in a convenient digital format. It is essential that users comply with all relevant local, national, and international laws, including copyright laws, intellectual property rights, and terms of service agreements, when using the Tool.
2. Fair Use. The Tool should be used in accordance with the principles of fair use and fair dealing, which typically allow for limited and transformative uses of copyrighted materials for purposes such as criticism, commentary, research, and educational activities. Users are responsible for determining the applicability of fair use and should exercise their judgment accordingly.
3. Ethical Usage. Users of the Tool should act responsibly and ethically. It is strongly advised not to use the Tool to infringe upon the rights of authors, publishers, or content creators. The Tool should not be used for unauthorized distribution or sharing of copyrighted materials, or for any other activity that may harm the interests of rights holders or violate applicable laws.
4. Disclaimer of Liability. The creator of the Tool cannot be held responsible for any misuse or illegal activities conducted by users. The Tool is provided on an "as is" basis, without any warranties or guarantees, and the creator disclaims any liability for the accuracy, reliability, or legality of its use by others. Users assume full responsibility for their actions and the consequences that may arise from using the Tool.

By using the Tool, users acknowledge that they have read, understood, and agreed to this disclaimer. The Tool should only be used in compliance with applicable laws, and users should seek legal advice if they have any concerns regarding copyright infringement or other legal matters. Responsible and lawful usage of the Tool is encouraged and any association with or endorsement of illegal activities is disclaimed.

Please note that this disclaimer is provided as a general guide and may not cover all legal aspects or jurisdictions. It is recommended to consult a legal professional or seek specific legal advice to ensure compliance with relevant laws and regulations.

### License

[![Creative Commons License](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).
