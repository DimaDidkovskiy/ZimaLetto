import { Router } from "express";
import Product from "../entity/Product";
import SizeOptions from "../entity/SizeOptions";
import { IReqDataProduct } from "../types";
import { exportFile } from "../utils/S3";
import multer from "multer";

export const productRouter = Router();

const productPerPage = 9;

// GET ===========================
productRouter.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const productRepository = req.db.getRepository(Product);
        // const numOfProduct = await productRepository.findAndCount()
        const productList = await productRepository.findAndCount({
            relations: ["category", "product_size"],
            skip: productPerPage * (page - 1),
            take: productPerPage,
        });
        return res.json(productList);
    } catch (error) {
        console.log(error);
        return res.send("Get error");
    }
});

productRouter.get("/:id", async (req, res) => {
    try {
        const productRepository = req.db.getRepository(Product);
        const productList = await productRepository.findOne(
            {
                id: req.params.id,
            },
            { relations: ["product_size"] }
        );
        return res.json(productList);
    } catch (error) {
        console.log(error);
        return res.send("Get one error");
    }
});

const upload = multer();

// POST ==========================
productRouter.post("/", upload.single("image"), async (req, res) => {
    try {
        console.log(req.file);
        const body: IReqDataProduct = req.body;
        const productRepository = req.db.getRepository(Product);
        const sizeRepository = req.db.getRepository(SizeOptions);
        await exportFile(req.file);
        const productsSizes = await sizeRepository.find({
            where: body.product_size.map((size) => {
                return { id: size };
            }),
        });
        const product = productRepository.create({
            ...body,
            product_size: productsSizes,
        });
        await productRepository.save(product);
        return res.send("Post done");
    } catch (error) {
        console.log(error);
        return res.send("Post error");
    }
});

productRouter.post("/:id", async (req, res) => {
    try {
        const body: IReqDataProduct = req.body;
        const productRepository = req.db.getRepository(Product);
        const sizeRepository = req.db.getRepository(SizeOptions);
        const product = await productRepository.findOne(
            { id: req.params.id },
            { relations: ["category", "product_size"] }
        );
        if (!product) {
            throw new Error(`Product not found ${req.params.id}`);
        }
        const productsSizes = await sizeRepository.find({
            where: body.product_size.map((size) => {
                return { id: size };
            }),
        });
        console.log(product.product_size);
        await productRepository
            .createQueryBuilder()
            .relation(Product, "product_size")
            .of(product)
            .addAndRemove(productsSizes, product.product_size);
        delete req.body.product_size;
        await productRepository.update({ id: req.params.id }, req.body);

        return res.send("Post update is done");
    } catch (error) {
        console.log(error);
        return res.send("Post update error");
    }
});
// DELETE ========================
productRouter.delete("/:id", async (req, res) => {
    try {
        const productRepository = req.db.getRepository(Product);
        await productRepository.delete({ id: req.params.id });
        return res.send("Delete is done");
    } catch (error) {
        console.log(error);
        return res.send("Delete error");
    }
});
